/********************************************************************************
* WEB322 – Assignment 02
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
*
* Name: Minsik Kim Student ID: 185751237 Date: Nov 11, 2025
* Published URL: https://web-inky-one-67.vercel.app
********************************************************************************/

const express = require("express");
const path = require("path");
const projectData = require("./modules/projects");

const app = express();
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const HTTP_PORT = process.env.PORT || 8080;

async function fetchRandomQuote() {
  try {
    let fetchFn = typeof fetch === "function" ? fetch : null;
    if (!fetchFn) {
      fetchFn = (await import("node-fetch")).default;
    }

    const response = await fetchFn("https://dummyjson.com/quotes/random");
    if (!response.ok) {
      throw new Error(`Quote API responded with ${response.status}`);
    }
    const data = await response.json();
    return {
      text: data.quote,
      author: data.author,
    };
  } catch (err) {
    console.error("Failed to load quote", err.message || err);
    return null;
  }
}

function onHttpStart() {
  console.log(`Server listening on port ${HTTP_PORT}`);
}

projectData
  .initialize()
  .then(() => {
    app.listen(HTTP_PORT, onHttpStart);
  })
  .catch((err) => {
    console.error(`Unable to start server: ${err}`);
  });

app.get("/", async (req, res) => {
  try {
    const allProjects = await projectData.getAllProjects();
    const featuredProjects = allProjects.slice(0, 3);
    res.render("home", { featuredProjects });
  } catch (err) {
    console.error("Unable to load featured projects", err);
    res.render("home", { featuredProjects: [] });
  }
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/solutions/projects", async (req, res) => {
  const sectorQuery = (req.query.sector || "").trim();

  try {
    const [projects, allProjects] = await Promise.all([
      sectorQuery
        ? projectData.getProjectsBySector(sectorQuery)
        : projectData.getAllProjects(),
      projectData.getAllProjects(),
    ]);

    const validSectors = [
      ...new Set(allProjects.map((project) => project.sector)),
    ];

    res.render("projects", {
      projects,
      sector: sectorQuery || null,
      error: null,
      validSectors,
    });
  } catch (err) {
    let validSectors = [];
    try {
      const allProjects = await projectData.getAllProjects();
      validSectors = [...new Set(allProjects.map((project) => project.sector))];
    } catch (innerErr) {
      console.error("Unable to load sector list", innerErr);
    }

    const errorMessage = sectorQuery
      ? `No projects found for sector "${sectorQuery}".`
      : "Unable to load projects right now. Please try again later.";

    res.status(sectorQuery ? 404 : 500).render("projects", {
      projects: [],
      sector: sectorQuery || null,
      error: errorMessage,
      validSectors,
    });
  }
});

app.get("/solutions/projects/:id", async (req, res) => {
  try {
    const project = await projectData.getProjectById(req.params.id);
    const quote = await fetchRandomQuote();

    res.render("project", {
      project,
      quote,
    });
  } catch (err) {
    res.status(404).render("404", {
      message: "We couldn't find that project.",
    });
  }
});

app.use((req, res) => {
  res.status(404).render("404", {
    message: "The page you're looking for doesn't exist.",
  });
});
