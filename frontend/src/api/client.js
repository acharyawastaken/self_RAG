import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Health
  getHealth: () => api.get('/health').then(res => res.data),
  wakeOllama: () => api.post('/health/ollama/wake').then(res => res.data),

  // Documents
  getDocuments: () => api.get('/documents').then(res => res.data),
  getDocument: (id) => api.get(`/documents/${id}`).then(res => res.data),
  getDocumentChunks: (id) => api.get(`/documents/${id}/chunks`).then(res => res.data),
  deleteDocument: (id) => api.delete(`/documents/${id}`).then(res => res.data),
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },

  // Queries & QA
  askQuestion: (question, documentId = null, topK = null) => {
    return api.post('/queries', {
      question,
      document_id: documentId || null,
      top_k: topK || null,
    }).then(res => res.data);
  },
  getQuery: (id) => api.get(`/queries/${id}`).then(res => res.data),
  listQueries: (limit = 20) => api.get(`/queries?limit=${limit}`).then(res => res.data),

  // Feedback & Critique
  submitFeedback: (queryId, data) => {
    return api.post(`/queries/${queryId}/feedback`, data).then(res => res.data);
  },
  runCritique: (feedbackId) => {
    return api.post(`/feedback/${feedbackId}/critique`).then(res => res.data);
  },
  listCritiques: (status = null) => {
    const query = status ? `?status=${status}` : '';
    return api.get(`/critiques${query}`).then(res => res.data);
  },

  // Verification & Lessons
  verifyCorrection: (critiqueId, data) => {
    return api.post(`/corrections/${critiqueId}/verify`, data).then(res => res.data);
  },
  getLessons: (status = 'verified') => {
    return api.get(`/lessons?status=${status}`).then(res => res.data);
  },

  // Graph
  getGraph: (params = {}) => {
    return api.get('/graph', { params }).then(res => res.data);
  },
  getNodeDetails: (nodeId) => api.get(`/graph/nodes/${nodeId}`).then(res => res.data),
  getEdgeDetails: (edgeId) => api.get(`/graph/edges/${edgeId}`).then(res => res.data),
  getObsidianVaultInfo: () => api.get('/graph/obsidian/vault').then(res => res.data),
  rebuildGraph: (documentId) => api.post(`/graph/rebuild/${documentId}`).then(res => res.data),

  // Evaluations
  getEvaluations: () => api.get('/evaluations').then(res => res.data),
  runEvaluation: (datasetVersion = 'ai_intro_v1', notes = '') => {
    return api.post('/evaluations/run', {
      dataset_version: datasetVersion,
      notes,
    }).then(res => res.data);
  },
};
