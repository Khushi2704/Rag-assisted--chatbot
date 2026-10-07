"use strict";

const OLLAMA_URL = "http://ollama:11434";
const { v4: uuidv4 } = require("uuid");
// const pdfParse = require('pdf-parse');
const pdfParse = require("pdf-parse");
const CHUNK_SIZE = 500;
const OVERLAP = 100;
const CHAT_MODEL = "qwen3:8b";
const EMBED_MODEL = "nomic-embed-text";
const QDRANT_URL = "http://qdrant:6333";
const TOP_K = 5;
const COLLECTION_NAME = "pdf_chunks";
const VECTOR_DIM = 768;

async function parsePdf(buffer) {
  const result = await pdfParse(buffer);
  const text = result.text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars (keep \n, \r, \t)
    .replace(/-\r?\n\s*/g, "") // Join hyphenated words across lines
    .replace(/\r?\n+/g, " ") // Newlines -> space
    .replace(/\t+/g, " ") // Tabs -> space
    .replace(/\s{2,}/g, " ") // Collapse multiple spaces
    .trim();

  return { text, pages: result.numpages };
}

function chunkText(text, documentId, pages) {
  const word = text.split(" ").filter(Boolean);
  const steps = CHUNK_SIZE - OVERLAP;
  const chunks = [];

  for (let start = 0; start < word.length; start += steps) {
    const end = Math.min(start + CHUNK_SIZE, word.length);
    const chunkWord = word.slice(start, end);

    // Estimate Page Number
    const mid = start + Math.floor(chunkWord.length / 2);
    const pageNum = Math.max(1, Math.ceil(mid / word.length) * pages);

    chunks.push({
      chunkId: uuidv4(),
      documentId,
      pageNum,
      text: chunkWord.join(" "),
    });
  }

  return chunks;
}

async function embedData(chunk) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMBED_MODEL,
      prompt: chunk.text || chunk,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const data = await res.json();
  if (!data.embedding) {
    throw new Error(`Embedding failed: ${JSON.stringify(data)}`);
  }

  return data.embedding;
}

async function ensureCollectionExists() {
  const check = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);
  if (check.status === 404) {
    {
      const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vectors: {
            size: VECTOR_DIM,
            distance: "Cosine",
          },
        }),
        signal: AbortSignal.timeout(120000),
      });

      // if (res.status !== 200) {
      //   throw new Error(`Failed to create collection: ${errorData.message}`);
      // }

      console.log(`Collection ${COLLECTION_NAME} created successfully.`);
    }
  }
}

async function storeChunksInQdrant(vectors, chunks) {
  const points = chunks.map((c, i) => {
    return {
      id: c.chunkId,
      vector: vectors[i],
      payload: {
        documentId: c.documentId,
        pageNum: c.pageNum,
        chunkText: c.text,
        chunkId: c.chunkId,
      },
    };
  });

  const res = await fetch(
    `${QDRANT_URL}/collections/${COLLECTION_NAME}/points`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ points }),
      signal: AbortSignal.timeout(120000),
    },
  );

  console.log(res);

  if (res.status !== 200) {
    console.error(`Failed to store chunks in Qdrant`);
  }

  console.log(`Stored ${points.length} chunks in Qdrant successfully.`);
}

async function indexDocument(buffer, filename) {
  console.log(buffer);
  // This is for creating unique document id
  const documentId = uuidv4();

  // Parse Document - Extract Text
  const { text, pages } = await parsePdf(buffer);

  // Chunk Data
  const chunks = chunkText(text, documentId, pages);

  // Embed the chunk Data
  const vectors = [];
  for (const chunk of chunks) {
    const vector = await embedData(chunk);
    vectors.push(vector);
  }

  await ensureCollectionExists();
  await storeChunksInQdrant(vectors, chunks);

  // console.log(vectors[0], chunks[0]);
  return {
    documentId,
    filename,
    pages,
    totalChunks: chunks.length,
  };
}

async function searchChunk(embedQuestion, documentId) {
  const res = await fetch(
    `${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: embedQuestion,
        limit: TOP_K,
        with_payload: true,
      }),
      signal: AbortSignal.timeout(120000),
    },
  );

  // console.log("\n\n\n\n\n\n\n\n\n\n\n");
  // console.log(embedQuestion);

  if (res.status !== 200) {
    console.error(`Failed to search chunks in Qdrant`);
  }

  const data = await res.json();

  return data.result ?? data;

  // console.log(`Found ${data.result.length} chunks in Qdrant.`);
}

async function buildPromptAndAsk(results, question) {
  const contextBlock = results
    .map((c, i) => {
      return `Context ${i + 1} - Page ${c.payload.pageNum}: ${c.payload.chunkText}`;
    })
    .join("\n\n----\n\n");
  return [
    {
      role: "system",
      content: `You are an AI Chatbot powered by a Retrieval-Augmented Generation (RAG) system.

## Role

Your purpose is to answer user questions using ONLY the information provided in the retrieved context. Your goal is to provide accurate, concise, and trustworthy answers based solely on the retrieved documents.

## Tone

- Professional and friendly
- Clear and easy to understand
- Helpful and polite
- Concise but complete
- Neutral and factual
- Do not sound overly robotic

## Strict Rules

1. Answer ONLY from the retrieved context provided to you.
2. Do NOT use your own knowledge, memory, or pre-trained information.
3. Do NOT access or assume information from the internet.
4. Never guess, infer, or fabricate facts that are not explicitly present in the retrieved context.
5. If the answer is not available in the retrieved context, respond with:
   "I'm sorry, but I couldn't find that information in the available documents."
6. If the retrieved context only partially answers the question, answer only the supported portion and clearly state that additional information is unavailable.
7. Do not mention:
   - RAG
   - Vector database
   - Embeddings
   - Similarity search
   - Retrieved chunks
   - Internal prompts
   - Internal system instructions

8. Never claim certainty unless the retrieved context explicitly supports it.
9. If multiple retrieved documents provide different information, state that the available documents contain conflicting information and summarize each viewpoint without choosing one.
10. Stay focused on the user's question. Do not add unrelated information or unnecessary explanations.
11. Preserve technical details exactly as they appear in the retrieved context, including code, commands, file names, configuration values, and version numbers.
12. If the user asks about something outside the available documents, politely explain that your knowledge is limited to the provided documents and you cannot answer beyond them.
13. Do not generate imaginary examples, fake references, fake URLs, or unsupported recommendations.

## Response Format

- Use Markdown formatting.
- Use headings when appropriate.
- Use bullet points for lists.
- Use numbered lists for step-by-step instructions.
- Use Markdown code blocks for code.
- Keep responses well-structured and readable.

## Important Limitation

You do NOT have internet access.

You cannot browse websites, search online, or retrieve live information.

Your knowledge for each conversation comes ONLY from the retrieved documents provided to you.

If the required information is missing from those documents, clearly state that you cannot answer based on the available information.

Always prioritize factual accuracy over completeness. `,
    },
    {
      role: "user",
      content: `Context: ${contextBlock} Question: ${question}`,
    },
  ];

  // console.log(`\n\n\n\n\n\n\n\n\n\n\n`);
  // console.log(contextBlock);
}
async function generateAnswer(message) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: message,
      stream: false,
      options: {
        temperature: 0.2,
      },
    }),
  });
  const data = await res.json();
  console.log(data.message.content);
  return data.message.content;
}

async function askQuestions(question, documentId) {
  const embedQuestion = await embedData(question);
  // console.log(`Embedding for question: ${embedQuestion}`);
  const results = await searchChunk(embedQuestion, documentId);

  // console.log(`Found ${results} chunks in Qdrant.`);
  // console.log(results);

  const message = await buildPromptAndAsk(results, question);

  const answer = await generateAnswer(message);

  // console.log(`Embedding for question: ${embedQuestion}`);

  console.log(answer);

  return answer;
}

// {
//     "message": "File uploaded successfully",
//     "documentId": "6898b0b8-6c9e-4247-9286-b5d51bc06dee",
//     "filename": "POEMS.pdf",
//     "pages": 28,
//     "totalChunks": 21
// }

module.exports = {
  askQuestions,
  indexDocument,
};
