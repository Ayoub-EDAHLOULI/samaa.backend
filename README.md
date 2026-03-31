# 🎧 Samaa Backend API (سماع)

**Samaa** is an AI-powered audio recognition platform—essentially "Shazam for the Quran." It allows users to upload or record an audio snippet of a Quranic recitation and instantly identifies the Qari (reciter) with high accuracy using a custom Machine Learning ensemble model.

This repository houses the **Main Gateway API**, built with **Express.js and TypeScript**. It acts as the central nervous system of the Samaa platform.

## 🏗️ Architecture & Responsibilities

This backend operates within a microservice architecture. It does **not** run the ML model directly. Instead, it serves as the traffic controller and data manager:

* **Audio Proxying:** Intercepts audio files from mobile (React Native) and web (Next.js) clients and proxies them in real-time to our isolated Python (FastAPI) Machine Learning microservice.
* **Confidence Filtering:** Evaluates the AI's prediction confidence scores to ensure users only receive highly accurate matches.
* **User Management:** Handles JWT authentication, registration, and session security.
* **Data Persistence:** Uses **PostgreSQL** and **Prisma ORM** to store user search histories, favorite reciters, and enriched reciter metadata (biographies, images).

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Language:** TypeScript
* **Database:** PostgreSQL
* **ORM:** Prisma
* **File Handling:** Multer & Form-Data
* **Security:** Bcrypt.js, Helmet, Express Rate Limit
