import { Router, type Router as RouterType } from "express";
import { getPresignedUrl } from "../controllers/imageController";
import { attachAuth } from "../middleware/auth";

const router: RouterType = Router();

router.use(attachAuth);
router.post("/images/presigned-url", getPresignedUrl);

export default router;
