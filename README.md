# Lista

Lista is an AI-powered productivity web application that allows users to create tasks naturally using plain language. Instead of manually setting due dates, categories, reminders, and assignments, users can simply type the way they normally think, and the AI automatically organizes everything.

Built during the DevKada Hackathon 2026.

---

## Overview

Most productivity applications require too much manual setup before users can save a task. Users are often forced to:
- Create projects
- Select categories
- Set due dates
- Configure reminders
- Organize tasks manually

Lista removes this friction by using AI-powered natural language parsing.

Example:

> "Finish the UI prototype tomorrow and send it to Ken"

The system automatically extracts:
- Task name
- Due date
- Category
- Assignee

This allows users to capture tasks in seconds without interrupting their workflow.

---

## Features

### Natural Language Task Input
Users can create tasks using normal conversational text without following a specific format.

### AI Task Parsing
The AI automatically extracts:
- Task name
- Due date
- Category
- Assignee

### Automatic Categorization
Tasks are automatically grouped into categories:
- School
- Work
- Personal
- Errands
- Health

### Smart Reminders
The system automatically schedules reminders based on detected due dates.

### Task Dashboard
Users can:
- View all tasks
- Sort tasks
- Filter by category
- Organize tasks by due date

### Shared Spaces
Users can create collaborative spaces for teams or groups.

### Automatic Task Assignment
Tasks mentioning a teammate’s name can automatically assign to that person.

### Manual Editing
Users can manually edit AI-generated fields if corrections are needed.

### Real-Time Synchronization
Tasks update instantly across devices using Supabase Realtime.

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
git clone https://github.com/yourusername/teamname-projectname.git
```

Navigate into the project folder:

```bash
cd teamname-projectname
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
6. Reminders are scheduled automatically
7. Tasks sync in real time across devices

---

## Live Demo

https://lista-orpin.vercel.app

---

## GitHub Repository Rules Compliance

This project was built entirely during the DevKada Hackathon sprint period from May 3 to May 7, 2026.

The project:
- Uses original team work
- Includes a public repository
- Contains a complete README.md
- Uses AI assistance responsibly
- Includes a deployed live version for testing

---

## License

This project was created for educational and hackathon purposes only.
