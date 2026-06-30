# Smart City Reach

Welcome to the Smart City Reach project! This repository contains the source code for the application and the computer vision models used in the project.

## Directory Structure

- `application/`: Contains the main web application (React frontend and FastAPI backend).
- `gDinoSam/`: Contains the GroundingDINO and SAM (Segment Anything Model) integration for computer vision tasks.

---

## 1. Setting up the Application (`application/`)

The application consists of a modern React frontend (built with Vite) and a Python FastAPI backend.

### Frontend Setup

1. **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) and [Bun](https://bun.sh/) (or npm) installed.
2. **Navigate to the application folder**:
   ```bash
   cd application
   ```
3. **Install dependencies**:
   ```bash
   bun install
   # or npm install
   ```
4. **Run the frontend development server**:
   ```bash
   bun run dev
   # or npm run dev
   ```
   The frontend will be available at `http://localhost:5173` (or as indicated in the terminal).

### Backend Setup

1. **Prerequisites**: Ensure you have Python 3.9+ installed.
2. **Navigate to the backend folder**:
   ```bash
   cd application/backend
   ```
3. **Create and activate a virtual environment**:
   - **Windows**:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **macOS/Linux**:
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```
4. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Set up the Database & Environment Variables**:
   - Copy `.env.example` to `.env` (if applicable) and fill in your database credentials.
   - Run Alembic migrations to set up your database schema:
     ```bash
     alembic upgrade head
     ```
   - (Optional) Seed the database with demo users:
     ```bash
     python seed_demo_users.py
     ```
6. **Run the FastAPI server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend API will be running at `http://localhost:8000`.

---

## 2. Setting up the Computer Vision Models (`gDinoSam/`)

The `gDinoSam` directory contains the integration of GroundingDINO and SAM models for advanced image segmentation and detection.

### Environment Setup

1. **Navigate to the model directory**:
   ```bash
   cd gDinoSam
   ```
2. **Create and activate a virtual environment**:
   - **Windows**:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **macOS/Linux**:
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```
3. **Install dependencies**:
   ```bash
   cd GroundingDINO
   pip install -r requirements.txt
   pip install -e .
   ```

### Downloading Model Weights

Due to GitHub's file size limits, the large model weights are not tracked in this repository. You must download them manually into the `gDinoSam/GroundingDINO/weights/` folder.

1. **Create the weights directory** (if it doesn't exist):
   ```bash
   mkdir -p weights
   cd weights
   ```
2. **Download GroundingDINO weights**:
   ```bash
   wget -q https://github.com/IDEA-Research/GroundingDINO/releases/download/v0.1.0-alpha/groundingdino_swint_ogc.pth
   ```
3. **Download SAM weights**:
   Depending on the specific SAM version used (e.g., SAM 2.1 Hiera Large), download the appropriate `.pt` file and place it in the `weights` directory.
   - Example (SAM2.1 Hiera Large): [Download Link](https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt)

### Running Inference

Once the environment is set up and weights are downloaded, you can run the demo script:
```bash
python grounded_sam2_demo.py
```
This script will typically process images from the `input/` folder and save the results to the `output/` folder.
