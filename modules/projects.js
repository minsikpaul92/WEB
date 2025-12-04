require('dotenv').config();
require('pg');
const Sequelize = require('sequelize');

let sequelize = new Sequelize(process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD, {
    host: process.env.PGHOST,
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: { rejectUnauthorized: false }
    }
});

const Sector = sequelize.define('Sector', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sector_name: Sequelize.STRING
}, {
    createdAt: false,
    updatedAt: false
});

const Project = sequelize.define('Project', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: Sequelize.STRING,
    feature_img_url: Sequelize.STRING,
    summary_short: Sequelize.TEXT,
    intro_short: Sequelize.TEXT,
    impact: Sequelize.TEXT,
    original_source_url: Sequelize.STRING
}, {
    createdAt: false,
    updatedAt: false
});

Project.belongsTo(Sector, {foreignKey: 'sector_id'});

function initialize(){
    return new Promise((resolve, reject) => {
        sequelize.sync()
        .then(() => resolve())
        .catch(err => reject(err));
    });
}

function getAllProjects(){
    return new Promise((resolve, reject) => {
        Project.findAll({ include: [Sector] })
        .then(data => resolve(data))
        .catch(err => reject(err));
    });
}

function getProjectById(projectId){
    return new Promise((resolve, reject) => {
        Project.findAll({ 
            include: [Sector],
            where: { id: projectId }
        })
        .then(data => {
            if(data.length > 0) resolve(data[0]);
            else reject("Unable to find requested project");
        })
        .catch(err => reject(err));
    });
}

function getProjectsBySector(sector){
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [Sector],
            where: {
                '$Sector.sector_name$': {
                    [Sequelize.Op.iLike]: `%${sector}%`
                }
            }
        })
        .then(data => {
            if(data.length > 0) resolve(data);
            else reject("Unable to find requested projects");
        })
        .catch(err => reject(err));
    });
}

function addProject(projectData) {
    return new Promise((resolve, reject) => {
        for (let prop in projectData) {
            if (projectData[prop] === "") projectData[prop] = null;
        }

        Project.create(projectData)
            .then(() => {
                resolve();
            })
            .catch((err) => {
                if (err.errors && err.errors[0]) {
                    reject(err.errors[0].message);
                } else {
                    reject(err.message);
                }
            });
    });
}

function editProject(id, projectData) {
    return new Promise((resolve, reject) => {
        for (let prop in projectData) {
            if (projectData[prop] === "") projectData[prop] = null;
        }

        Project.update(projectData, {
            where: { id: id }
        })
        .then(() => resolve())
        .catch((err) => {
            if (err.errors && err.errors[0]) {
                reject(err.errors[0].message);
            } else {
                reject(err.message);
            }
        });
    });
}

function deleteProject(id) {
    return new Promise((resolve, reject) => {
        Project.destroy({
            where: { id: id }
        })
        .then(() => resolve())
        .catch((err) => {
            if (err.errors && err.errors[0]) {
                reject(err.errors[0].message);
            } else {
                reject(err.message);
            }
        });
    });
}

function getAllSectors() {
    return new Promise((resolve, reject) => {
        Sector.findAll()
            .then(data => resolve(data))
            .catch(err => reject(err));
    });
}

module.exports = {
    initialize,
    getAllProjects,
    getProjectById,
    getProjectsBySector,
    addProject,
    editProject,
    deleteProject,
    getAllSectors,
    Sector,
    Project,
    sequelize
};