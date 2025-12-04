/********************************************************************************
* WEB322 – Assignment 03
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
*
* Name: Minsik Kim Student ID: 185751237 Date: Dec 3, 2025
* Published URL: https://web-ykl1oqai0-minsikpaul92s-projects.vercel.app
********************************************************************************/

const express = require("express");
const path = require("path");
const clientSessions = require("client-sessions");
const projectData = require("./modules/projects");

const app = express();
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Client Sessions Configuration
app.use(
  clientSessions({
    cookieName: "session",
    secret: process.env.SESSIONSECRET,
    duration: 2 * 60 * 1000, // 2 minutes
    activeDuration: 1000 * 60, // 1 minute
  })
);

// Make session available to all views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Helper middleware to protect routes
function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

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
    console.log("Fetched projects:", JSON.stringify(allProjects, null, 2)); // Debugging log
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
      ...new Set(allProjects.map((project) => project.Sector.sector_name)),
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
      validSectors = [...new Set(allProjects.map((project) => project.Sector.sector_name))];
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

app.get("/solutions/addProject", ensureLogin, async (req, res) => {
  try {
    const sectors = await projectData.getAllSectors();
    res.render("addProject", { sectors: sectors });
  } catch (err) {
    res.status(500).render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

app.post("/solutions/addProject", ensureLogin, async (req, res) => {
  try {
    await projectData.addProject(req.body);
    res.redirect("/solutions/projects");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

app.get("/solutions/editProject/:id", ensureLogin, async (req, res) => {
  try {
    const [project, sectors] = await Promise.all([
      projectData.getProjectById(req.params.id),
      projectData.getAllSectors()
    ]);
    res.render("editProject", { project: project, sectors: sectors });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.post("/solutions/editProject", ensureLogin, async (req, res) => {
  try {
    await projectData.editProject(req.body.id, req.body);
    res.redirect("/solutions/projects");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

app.get("/solutions/deleteProject/:id", ensureLogin, async (req, res) => {
  try {
    await projectData.deleteProject(req.params.id);
    res.redirect("/solutions/projects");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
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

app.get("/login", (req, res) => {
  res.render("login", { errorMessage: "", userName: "" });
});

app.post("/login", (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  if (
    req.body.userName === process.env.ADMINUSER &&
    req.body.password === process.env.ADMINPASSWORD
  ) {
    req.session.user = {
      userName: req.body.userName,
      email: req.body.email, // Note: email is not in form but good for structure
      loginDate: new Date(),
    };
    res.redirect("/solutions/projects");
  } else {
    res.render("login", {
      errorMessage: "Invalid User Name or Password",
      userName: req.body.userName,
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

app.use((req, res) => {
  res.status(404).render("404", {
    message: "The page you're looking for doesn't exist.",
  });
});
