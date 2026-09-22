const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const authController = require('../controllers/authController');
const settingsController = require('../controllers/settingsController');
const certificateController = require('../controllers/certificateController');
const approvalController = require('../controllers/approvalController');
const verificationController = require('../controllers/verificationController');
const apiKeyController = require('../controllers/apiKeyController');
const analyticsController = require('../controllers/analyticsController');

// ==========================================
// PUBLIC ROUTES (No Auth Required)
// ==========================================
router.get('/public/club', settingsController.getPublicClubInfo);
router.get('/verify/:identifier', verificationController.verifyCertificate);
router.post('/auth/login', authController.login);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================
router.use(authenticate);

// User & Auth Management
router.get('/auth/me', authController.getMe);
router.get('/auth/users', authorize('superadmin'), authController.listUsers);
router.post('/auth/users', authorize('superadmin'), authController.createUser);
router.put('/auth/users/:id', authorize('superadmin'), authController.updateUserRole);

// Club Information & Settings
router.get('/settings/club', settingsController.getClubSettings);
router.post('/settings/club', authorize('superadmin'), settingsController.updateClubSettings);

// Certificate Types & Templates
router.get('/settings/types', settingsController.listCertificateTypes);
router.post('/settings/types', authorize('superadmin', 'cert_admin'), settingsController.createCertificateType);
router.get('/settings/templates', settingsController.listTemplates);
router.put('/settings/templates/:id', authorize('superadmin', 'cert_admin'), settingsController.updateTemplate);

// Certificate Management
router.get('/certificates', certificateController.listCertificates);
router.get('/certificates/:id', certificateController.getCertificate);
router.post('/certificates', authorize('superadmin', 'cert_admin', 'approver'), certificateController.createCertificate);
router.post('/certificates/bulk', authorize('superadmin', 'cert_admin'), certificateController.bulkImport);
router.post('/certificates/:id/revoke', authorize('superadmin'), certificateController.revokeCertificate);
router.post('/certificates/:id/supersede', authorize('superadmin', 'cert_admin', 'approver'), certificateController.supersedeCertificate);

// Approval Workflow
router.get('/approvals/pending', authorize('superadmin', 'approver'), approvalController.listPendingApprovals);
router.post('/approvals/:id/approve', authorize('superadmin', 'approver'), approvalController.approveCertificate);
router.post('/approvals/:id/reject', authorize('superadmin', 'approver'), approvalController.rejectCertificate);

// Dashboard & Analytics
router.get('/analytics/dashboard', analyticsController.getDashboardStats);
router.get('/analytics/audit-logs', authorize('superadmin'), analyticsController.getAuditLogs);
router.get('/analytics/verification-logs', analyticsController.getVerificationLogs);

// API Keys & Webhooks for Website Integration
router.get('/integration/keys', authorize('superadmin'), apiKeyController.listApiKeys);
router.post('/integration/keys', authorize('superadmin'), apiKeyController.createApiKey);
router.delete('/integration/keys/:id', authorize('superadmin'), apiKeyController.revokeApiKey);
router.get('/integration/webhooks', authorize('superadmin'), apiKeyController.listWebhooks);
router.post('/integration/webhooks', authorize('superadmin'), apiKeyController.createWebhook);
router.delete('/integration/webhooks/:id', authorize('superadmin'), apiKeyController.deleteWebhook);
router.post('/integration/webhooks/:id/test', authorize('superadmin'), apiKeyController.testWebhook);

module.exports = router;
