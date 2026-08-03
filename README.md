# LearnQube APIs

Backend APIs for the LearnQube ed-tech platform targeting State Board students.

## APIs

| Feature | Endpoint | Tool |
|---|---|---|
| Formula OCR | `POST /api/formula/ocr` | pix2tex (Python) |
| Formula Render | `POST /api/formula/render` | KaTeX |
| Handwriting OCR | `POST /api/handwriting` | Groq + Llama 4 |

## Setup

### 1. Clone the repo
git clone https://github.com/your-username/learnqube-apis.git
cd learnqube-apis

### 2. Install dependencies
npm install

### 3. Create .env file
cp .env.example .env
Add your GROQ_API_KEY from https://console.groq.com

### 4. Start the Node server
npm start

### 5. Start the Python pix2tex service (separate terminal)
python formula_service.py

## Usage

### Formula OCR (image to LaTeX)
POST /api/formula/ocr
Body (form-data): image (File)
Body (JSON): { "image_url": "https://..." }

### Formula Render (text to formula)
POST /api/formula/render
Body (JSON): { "formula": "a*b=c" }

### Handwriting OCR
POST /api/handwriting
Body (form-data): image (File)
Body (JSON): { "image_url": "https://..." }