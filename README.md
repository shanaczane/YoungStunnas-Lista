# Lista

Lista is an AI-powered productivity web application that allows users to create and organize tasks using natural language. Instead of manually setting due dates, reminders, categories, and assignments, users can simply type the way they naturally think while the AI automatically structures and organizes the task for them.

Built during the DevKada Hackathon 2026.

---

## Overview

Traditional productivity apps often require too much setup before users can even save a task. Users are usually forced to manually:
- Create projects
- Select categories
- Set due dates
- Configure reminders
- Organize tasks

Lista removes this friction by using AI-powered natural language task parsing.

Example:

> "Finish the UI prototype tomorrow"

The system automatically extracts:
- Task name
- Due date
- Category
- Assignee

This allows users to capture tasks quickly without interrupting their workflow.

---

## Features

### Natural Language Task Input
Users can create tasks using plain conversational text without following a strict format.

### AI-Powered Task Parsing
Using Ollama, the app automatically extracts:
- Task name
- Due date
- Category
- Assignee

### Automatic Categorization
Tasks are intelligently organized into categories such as:
- School
- Work
- Personal
- Errands
- Health

### Smart Reminders
Automatic reminders are scheduled based on detected due dates.

### Task Dashboard
Users can:
- View all tasks
- Sort tasks
- Filter by category
- Organize tasks by due date

### Shared Spaces
Collaborative spaces allow teams and groups to manage shared tasks together.

### Automatic Task Assignment
Tasks mentioning a teammate’s name can automatically assign the task to that person.

### Manual Editing
Users can edit AI-generated fields whenever adjustments are needed.

### Real-Time Synchronization
Task updates sync instantly across devices using Supabase Realtime.

### Progressive Web App (PWA)
Lista is installable on both Android and iOS devices directly from the browser.

---

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS

### Backend and Database
- Supabase

### AI Integration
- Ollama

### Deployment
- Vercel

---

## Live Demo

https://lista-orpin.vercel.app

---

## Project Structure

```bash
src/
├── components/
├── pages/
├── hooks/
├── services/
├── utils/
├── context/
├── assets/
└── App.jsx
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/shanaczane/YoungStunnas-Lista.git
```

Navigate into the project folder:

```bash
cd YoungStunnas-Lista
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

---

## Environment Variables

Create a `.env` file in the root directory and add the following:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OLLAMA_API_URL=your_ollama_api_url
```

---

## AI Parsing Example

### User Input

```txt
Submit thesis draft by Friday and send it to Mark
```

### AI Output

```json
{
  "task": "Submit thesis draft",
  "due_date": "2026-05-08",
  "category": "School",
  "assignee": "Mark"
}
```

---

## How It Works

1. User enters a task naturally
2. Input is sent to Ollama
3. AI processes the text
4. Structured task data is returned
5. Task is automatically categorized and saved
6. Smart reminders are scheduled automatically
7. Tasks sync in real time across devices

---

## GitHub Rules Compliance

This project was built entirely during the DevKada Hackathon sprint period from May 3 to May 7, 2026.

The project:
- Uses original team work
- Includes a public repository
- Contains a complete README.md
- Uses AI assistance responsibly
- Includes a deployed live version for testing

---

## Future Improvements

Planned future features include:
- AI assistant chat
- Productivity analytics
- Task summaries
- Completion streaks
- Calendar integrations
- Voice input
- File attachments
- Advanced recurring tasks

---

## License

This project was created for educational and hackathon purposes only.
