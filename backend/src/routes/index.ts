import { Router } from 'express';
import authRoutes from './auth';
import companyRoutes from './companies';
import userRoutes from './users';
import customerRoutes from './customers';
import equipmentRoutes from './equipment';
import agreementRoutes from './agreements';
import serviceCallRoutes from './serviceCalls';
import opportunityRoutes from './replacementOpportunities';
import invoiceRoutes from './invoices';
import billingRoutes from './billing';
import webhookRoutes from './webhooks';

const router = Router();

// Health check included in main app — routes here are /api/...

router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/agreements', agreementRoutes);
router.use('/service-calls', serviceCallRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/billing', billingRoutes);
router.use('/webhooks', webhookRoutes);

export { router as routes };