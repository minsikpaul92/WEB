const projectData = require("../data/projectData"); 
const sectorData = require("../data/sectorData"); 

let projects = [];

function initialize(){
    return new Promise((resolve, reject) => {
        try{
            const enrichedProjects = projectData.map((project) => {
                const sectorMatch = sectorData.find((sector) => sector.id === project.sector_id);

                if (!sectorMatch){
                    throw new Error(`Missing sector for project id ${project.id}`);
                }

                return {...project, sector: sectorMatch.sector_name};
            });

            projects = enrichedProjects;
            resolve();
        }catch(err){
            reject(err);
        }
    });
}

function getAllProjects(){
    return new Promise((resolve, reject) => {
        if(!projects.length){
            reject("projects data not initialized");
            return;
        }
        resolve(projects);
    });
}

function getProjectById(projectId){
    return new Promise((resolve, reject) => {
        if(!projects.length){
            reject("projects data not initialized");
            return;
        }
        const numericId = Number(projectId);
        const project = projects.find((item) => item.id === numericId);
        if(!project){
            reject("no results returned");
            return;
        }

        resolve(project);
    });
}

function getProjectsBySector(sector){
    return new Promise((resolve, reject) => {
        if(!projects.length){
            reject("projects data not initialized");
            return;
        }
        const searchTerm = typeof sector === "string" ? sector.trim().toLowerCase() : "";

        if(!searchTerm){
            reject("invalid sector");
            return;
        }
        const matchedProjects = projects.filter((project) => project.sector.toLowerCase().includes(searchTerm));

        if(!matchedProjects.length){
            reject("no results returned");
            return;
        }

        resolve(matchedProjects);
    });
}

module.exports = {
    initialize,
    getAllProjects,
    getProjectById,
    getProjectsBySector,
};

