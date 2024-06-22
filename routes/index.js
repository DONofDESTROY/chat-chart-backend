import express from "express";
import getConfig from "../controls/index.js";
const routes = express.Router();

routes.get("/get-config", getConfig);

export default routes;
