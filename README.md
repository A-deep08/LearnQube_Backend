# LearnQube Backend

Backend APIs for the LearnQube ed-tech platform targeting State Board students.

## APIs

| Feature | Endpoint | Tool |
|---|---|---|
| User Registration | `POST /api/auth/register` | MongoDB |
| User Login | `POST /api/auth/login` | MongoDB + JWT |
| Flashcard Generation | `POST /api/flashcards/generate` | Gemini AI |
| Formula OCR | `POST /api/formula/ocr` | pix2tex (Python) |
| Formula Render | `POST /api/formula/render` | KaTeX |
| Handwriting OCR | `POST /api/handwriting` | Groq + Llama 4 |

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/learnqube-apis.git
cd learnqube-apis
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create .env file

```bash
cp .env.example .env
```

Set your environment variables:

- `MONGODB_URI` — MongoDB connection string (local or Atlas)
- `JWT_SECRET` — secret for signing auth tokens
- `GEMINI_API_KEY` — from https://aistudio.google.com
- `GROQ_API_KEY` — from https://console.groq.com

### 4. Start the Node server

```bash
npm start
```

### 5. Start the Python pix2tex service (separate terminal)

```bash
python formula_service.py
```

## Usage

### Register

```
POST /api/auth/register
Body (JSON): { "name": "John", "email": "john@example.com", "password": "secret" }
```

### Login

```
POST /api/auth/login
Body (JSON): { "email": "john@example.com", "password": "secret" }
```

### Generate Flashcards

```
POST /api/flashcards/generate
Body (JSON): { "topic": "Photosynthesis" }
```

### Formula OCR (image to LaTeX)

```
POST /api/formula/ocr
Body (form-data): image (File)
Body (JSON): { "image_url": "https://..." }
```

### Formula Render (text to formula)

```
POST /api/formula/render
Body (JSON): { "formula": "a*b=c" }
```

### Handwriting OCR

```
POST /api/handwriting
Body (form-data): image (File)
Body (JSON): { "image_url": "https://..." }
```
