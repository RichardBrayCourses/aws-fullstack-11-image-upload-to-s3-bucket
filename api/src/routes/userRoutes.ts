// routes/userRoutes.ts
import { Router, type Router as RouterType } from "express";
import { getUser, updateNickname } from "../controllers/userController";

const router: RouterType = Router();

router.get("/users/:sub", getUser);
router.put("/users/:sub/nickname", updateNickname);

export default router;
