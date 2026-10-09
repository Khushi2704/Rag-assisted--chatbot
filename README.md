# 🤖 AI-Powered RAG Chatbot

An intelligent, Retrieval-Augmented Generation (RAG) chatbot powered by **Qwen and Ollama**, designed to generate context-aware responses using relevant information retrieved from a knowledge source. The application combines a modern Angular frontend with a locally running Large Language Model (LLM) to deliver an interactive AI chat experience.

## ✨ Features

- **Retrieval-Augmented Generation (RAG):** Retrieves relevant context to help generate more informed responses.
- **Local LLM Integration:** Uses Qwen models through Ollama for local inference.
- **Context-Aware Conversations:** Combines retrieved information with the user's query to generate responses.
- **Interactive Chat Interface:** Built with Angular for a responsive, user-friendly experience.
- **Privacy-Friendly Inference:** Supports local model execution without requiring a cloud-hosted LLM API.
- **Modular Architecture:** Separates the user interface, retrieval workflow, and language generation components.

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | Angular |
| LLM | Qwen |
| Model Runtime | Ollama |
| AI Architecture | Retrieval-Augmented Generation (RAG) |
| Containerization | Docker |
| Backend / Retrieval | Add the framework and libraries used in your implementation |

## 🧠 How It Works

1. **User Query:** The user submits a question through the Angular chat interface.
2. **Retrieval:** The RAG pipeline searches the available knowledge source for relevant information.
3. **Context Construction:** Retrieved information is combined with the user's question.
4. **LLM Processing:** The Qwen model, running through Ollama, processes the prompt and generates a response.
5. **Response Display:** The generated answer is returned to the chat interface.

```text
User
  |
  v
Angular Chat Interface
  |
  v
Backend / RAG Pipeline
  |
  +----> Retrieve Relevant Context
  |                 |
  |                 v
  |          Context + Query
  |                 |
  v                 v
       Qwen via Ollama
              |
              v
       Generated Answer
              |
              v
       Angular UI
```

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [Angular CLI](https://angular.dev/tools/cli)
- [Ollama](https://ollama.com/)
- [Docker](https://www.docker.com/), if using the Docker-based setup

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

### 2. Set Up the Qwen Model

Start Ollama and download the Qwen model used by your application:

```bash
ollama pull qwen3:8b
```

Use the exact model tag configured in your project if it differs.

### 3. Configure the Application

Set up any required environment variables, model settings, knowledge sources, and API configurations. Refer to your project's configuration files for the required values.

**Important:** Never commit API keys, private keys, passwords, or other secrets to GitHub.

### 4. Start the Application

Follow the startup commands configured for your project. For an Angular application, this may be:

```bash
npm install
ng serve
```

If your project uses Docker Compose, start the configured services using:

```bash
docker compose up --build
```

Use the appropriate startup method for your actual project structure.

## 📁 Project Structure

```text
project/
├── frontend/          # Angular application
├── backend/           # Backend and RAG logic
├── ollama_data/       # Local Ollama data, if configured
├── docker-compose.yml # Container orchestration, if present
├── .gitignore
└── README.md
```

Adjust the folder names to match your actual repository.

## 🔮 Future Improvements

- Add conversation history and persistent chat sessions.
- Improve retrieval quality through chunking and embedding optimization.
- Add source citations to generated responses.
- Introduce streaming responses for a smoother chat experience.
- Evaluate response relevance, factual accuracy, and retrieval performance.
- Add document upload and support for additional knowledge sources.

## 👩‍💻 Author

**Khushi**

B.Tech Computer Science and Engineering

---

*Built to explore local LLMs, retrieval-augmented generation, and full-stack AI application development.*
