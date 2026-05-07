const SOCIAL_KEY = 'lista-social-v1'

function emptySocial() {
  return {
    friendRequests: [],
    friendships: [],
    taskShares: [],
  }
}

function readSocial() {
  try {
    const saved = localStorage.getItem(SOCIAL_KEY)
    return saved ? { ...emptySocial(), ...JSON.parse(saved) } : emptySocial()
  } catch {
    return emptySocial()
  }
}

function writeSocial(data) {
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(data))
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase()
}

function samePair(a, b, c, d) {
  return (a === c && b === d) || (a === d && b === c)
}

export function getFriends(email) {
  const currentEmail = normalizeEmail(email)
  if (!currentEmail) return []
  return readSocial().friendships
    .filter(friend => friend.users.includes(currentEmail))
    .map(friend => {
      const friendEmail = friend.users.find(user => user !== currentEmail)
      return {
        email: friendEmail,
        displayName: friend.names?.[friendEmail] || friendEmail,
        createdAt: friend.createdAt,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export function getPendingFriendRequests(email) {
  const currentEmail = normalizeEmail(email)
  if (!currentEmail) return []
  return readSocial().friendRequests
    .filter(req => req.toEmail === currentEmail)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function sendFriendRequest({ fromEmail, fromName, toEmail }) {
  const sender = normalizeEmail(fromEmail)
  const recipient = normalizeEmail(toEmail)
  if (!sender || !recipient) return { error: 'Enter an email address.' }
  if (sender === recipient) return { error: 'You cannot add yourself.' }

  const social = readSocial()
  const alreadyFriends = social.friendships.some(friend => samePair(friend.users[0], friend.users[1], sender, recipient))
  if (alreadyFriends) return { error: 'You are already friends.' }

  const existing = social.friendRequests.find(req =>
    req.status === 'pending' &&
    ((req.fromEmail === sender && req.toEmail === recipient) || (req.fromEmail === recipient && req.toEmail === sender))
  )
  if (existing) return { error: 'A friend request is already pending.' }

  social.friendRequests.push({
    id: crypto.randomUUID(),
    fromEmail: sender,
    fromName: fromName || sender,
    toEmail: recipient,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
  writeSocial(social)
  return { ok: true }
}

export function respondToFriendRequest(requestId, accept) {
  const social = readSocial()
  const req = social.friendRequests.find(item => item.id === requestId)
  if (!req) return { error: 'Request not found.' }

  req.status = accept ? 'accepted' : 'declined'
  req.respondedAt = new Date().toISOString()

  if (accept) {
    const exists = social.friendships.some(friend => samePair(friend.users[0], friend.users[1], req.fromEmail, req.toEmail))
    if (!exists) {
      social.friendships.push({
        id: crypto.randomUUID(),
        users: [req.fromEmail, req.toEmail],
        names: {
          [req.fromEmail]: req.fromName || req.fromEmail,
          [req.toEmail]: req.toEmail,
        },
        createdAt: new Date().toISOString(),
      })
    }
  }

  writeSocial(social)
  return { ok: true }
}

export function removeFriend(email, friendEmail) {
  const currentEmail = normalizeEmail(email)
  const otherEmail = normalizeEmail(friendEmail)
  const social = readSocial()
  social.friendships = social.friendships.filter(friend => !samePair(friend.users[0], friend.users[1], currentEmail, otherEmail))
  writeSocial(social)
}

export function shareTaskWithFriend({ fromEmail, fromName, toEmail, task }) {
  const sender = normalizeEmail(fromEmail)
  const recipient = normalizeEmail(toEmail)
  if (!sender || !recipient) return { error: 'Choose a friend to share with.' }

  const social = readSocial()
  const isFriend = social.friendships.some(friend => samePair(friend.users[0], friend.users[1], sender, recipient))
  if (!isFriend) return { error: 'Add this person as a friend before sharing.' }

  social.taskShares.push({
    id: crypto.randomUUID(),
    fromEmail: sender,
    fromName: fromName || sender,
    toEmail: recipient,
    task: {
      task_name: task.task_name,
      content: task.content,
      category: task.category,
      due_date: task.due_date,
      notes: task.notes,
      reminder_minutes: task.reminder_minutes,
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
  writeSocial(social)
  return { ok: true }
}

export function getPendingTaskShares(email) {
  const currentEmail = normalizeEmail(email)
  if (!currentEmail) return []
  return readSocial().taskShares
    .filter(share => share.toEmail === currentEmail && share.status === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function respondToTaskShare(shareId, accept) {
  const social = readSocial()
  const share = social.taskShares.find(item => item.id === shareId)
  if (!share) return { error: 'Shared task not found.' }
  share.status = accept ? 'accepted' : 'declined'
  share.respondedAt = new Date().toISOString()
  writeSocial(social)
  return { ok: true, share }
}
