// routes/configRoutes.ts
import { Router, type Router as RouterType } from "express";
import { getConfig } from "../controllers/configController";

const router: RouterType = Router();

router.get("/config", getConfig);

export default router;
