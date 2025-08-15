# Gragolf WebDevMockup Backend Server

## Setup Instructions

1. **Install Node.js**

   - Download and install Node.js (https://nodejs.org/) if you don't have it already.

2. **Install dependencies**

   - Open a terminal in the project directory and run:
     ```
     npm install
     ```

3. **Start the server**
   - Run:
     ```
     npm start
     ```
   - The site will be available at [http://localhost:3000](http://localhost:3000)

## Security Measures

- Uses [Helmet](https://helmetjs.github.io/) to set secure HTTP headers.
- Disables directory listing for static files.
- Prevents MIME sniffing and disables caching for HTML files.
- Only serves files in the project directory.
