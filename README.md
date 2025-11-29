# ✈️ WanderStay

> **A full-stack Airbnb clone connecting travelers with unique stays around the world.**

![WanderStay Banner](https://raw.githubusercontent.com/brijeshrakholiya17/WanderStay-project/main/assets/Wanderlust.jpg)
### 🚀 **Live Demo:** [View WanderStay Live](https://wanderstay-project-jcnv.onrender.com)

---

## 📖 **Project Overview**

**WanderStay** is a robust full-stack web application inspired by Airbnb. It allows users to browse, create, and review property listings globally. The platform is built using the **MVC (Model-View-Controller)** architectural pattern to ensure scalability and maintainability.

It features secure user authentication, interactive maps for property locations, and image uploads via cloud storage. This project demonstrates proficiency in backend development, database management, and frontend rendering.

---

## ✨ **Key Features**

* **🔐 Authentication & Authorization:**
    * Secure user login and signup using **Passport.js**.
    * Authorization checks to ensure only listing owners can edit/delete their properties.
* **🏠 Listings Management (CRUD):**
    * Users can **Create, Read, Update, and Delete** property listings.
    * Dynamic routing for viewing listing details.
* **⭐ Review System:**
    * Guests can leave star ratings and comments on listings.
    * Reviews can be deleted by their authors.
* **🗺️ Interactive Maps:**
    * Integration with **Mapbox API** to display exact property locations using geocoding.
* **☁️ Cloud Image Storage:**
    * Listing images are uploaded and stored securely using **Cloudinary**.
* **🛡️ Error Handling:**
    * Robust client-side and server-side form validation using **Joi**.
    * Custom error handling middleware for a smooth user experience.

---

## 🛠️ **Tech Stack**

| Layer | Technology |
| :--- | :--- |
| **Frontend** | EJS (Embedded JavaScript), Bootstrap 5, HTML5, CSS3 |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Mongoose ODM |
| **Authentication** | Passport.js, Passport-Local |
| **Cloud Services** | Cloudinary (Image Storage), Mapbox (Maps), Render (Deployment) |
| **Tools** | Git, GitHub, VS Code, Postman |

---

## ⚙️ **Installation & Run Locally**

If you want to run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/brijeshrakholiya17/WanderStay-project.git](https://github.com/brijeshrakholiya17/WanderStay-project.git)
    cd WanderStay-project
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory and add the following keys:
    ```env
    CLOUD_NAME=your_cloudinary_name
    CLOUD_API_KEY=your_cloudinary_api_key
    CLOUD_API_SECRET=your_cloudinary_api_secret
    MAP_TOKEN=your_mapbox_token
    ATLASDB_URL=your_mongodb_atlas_connection_string
    SECRET=your_session_secret
    ```

4.  **Start the server:**
    ```bash
    node app.js
    ```

5.  **Visit the app:**
    Open your browser and go to `http://localhost:8080`

---

## 📂 **Project Structure (MVC)**

The project follows a structured Model-View-Controller pattern:

```text
📦 WanderStay
 ┣ 📂 models      # Database Schemas (Listing, Review, User)
 ┣ 📂 views       # EJS Templates (Frontend UI)
 ┣ 📂 controllers # Backend Logic & Functionality
 ┣ 📂 routes      # RESTful Routes (Express Router)
 ┣ 📂 public      # Static Assets (CSS, JS, Images)
 ┣ 📂 utils       # Helper Functions & Error Handlers
 ┗ 📜 app.js      # Main Entry Point
```

## 👨‍💻 Author

**Brijesh Rakholiya**
- [LinkedIn Profile](https://www.linkedin.com/in/brijeshrakholiya17)
- [GitHub Profile](https://github.com/brijeshrakholiya17)

Created with ❤️ and Node.js

