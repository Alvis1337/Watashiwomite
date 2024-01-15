import { Router } from 'express';
import malRoutes from './mal';

const router = Router();

router.use('/mal', malRoutes);

export default router;
