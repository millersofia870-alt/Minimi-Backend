import { Router } from 'express';
import { COUNTIES } from './counties.data';

export const referenceRouter = Router();

// GET /api/reference/counties
// Returns { "Kiambu": ["Ruiru", ...], ... } for cascading county/sub-county
// dropdowns on the frontend and mobile app.
referenceRouter.get('/counties', (req, res) => {
  res.json(COUNTIES);
});
