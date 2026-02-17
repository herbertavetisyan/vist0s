import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';

const PartnerManager = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPartnerName, setNewPartnerName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [copiedKey, setCopiedKey] = useState(null);

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        try {
            const response = await api.get('/admin/partners');
            setPartners(response.data);
        } catch (err) {
            console.error('Failed to fetch partners:', err);
            setError('Failed to load partners.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newPartnerName.trim()) return;

        setCreating(true);
        setError('');
        try {
            const response = await api.post('/admin/partners', { name: newPartnerName });
            setPartners([response.data, ...partners]);
            setNewPartnerName('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create partner');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this partner? Access will be revoked immediately.')) return;

        try {
            await api.delete(`/admin/partners/${id}`);
            setPartners(partners.filter(p => p.id !== id));
        } catch (err) {
            alert('Failed to delete partner');
        }
    };

    const handleRotateKey = async (id) => {
        if (!window.confirm('Are you sure? The old key will stop working immediately.')) return;

        try {
            const response = await api.put(`/admin/partners/${id}/rotate-key`);
            setPartners(partners.map(p =>
                p.id === id ? { ...p, apiKey: response.data.apiKey } : p
            ));
            alert('New API Key generated successfully.');
        } catch (err) {
            alert('Failed to rotate key');
        }
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(id);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Partner Management</h1>
                    <p className="text-gray-500 mt-2">Manage external integrations and API access keys.</p>
                </header>

                {/* Create New Partner */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Partner</h2>
                    {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
                    <form onSubmit={handleCreate} className="flex gap-4">
                        <input
                            type="text"
                            value={newPartnerName}
                            onChange={(e) => setNewPartnerName(e.target.value)}
                            placeholder="Enter partner name (e.g. 'Mobile App v2')"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                        <button
                            type="submit"
                            disabled={creating || !newPartnerName.trim()}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {creating ? 'Creating...' : <><Plus size={20} /> Create Partner</>}
                        </button>
                    </form>
                </div>

                {/* Partners List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Active Partners ({partners.length})</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading partners...</div>
                    ) : partners.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">No partners found. Create one to get started.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {partners.map(partner => (
                                <div key={partner.id} className="p-6 hover:bg-gray-50 transition-colors group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900">{partner.name}</h4>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${partner.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {partner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="ml-2 text-xs text-gray-400">Created: {new Date(partner.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRotateKey(partner.id)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Rotate API Key"
                                            >
                                                <RefreshCw size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(partner.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Revoke Access"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Credentials Box */}
                                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm relative group/code">
                                        <div className="grid grid-cols-[80px_1fr_auto] gap-y-2 items-center">
                                            <span className="text-gray-500">App ID:</span>
                                            <span className="text-blue-400 select-all">{partner.appId}</span>
                                            <button
                                                onClick={() => copyToClipboard(partner.appId, `app-${partner.id}`)}
                                                className="text-gray-500 hover:text-white transition-colors"
                                            >
                                                {copiedKey === `app-${partner.id}` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                            </button>

                                            <span className="text-gray-500">API Key:</span>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-green-400 select-all truncate">{partner.apiKey}</span>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(partner.apiKey, `key-${partner.id}`)}
                                                className="text-gray-500 hover:text-white transition-colors"
                                            >
                                                {copiedKey === `key-${partner.id}` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-widest bg-gray-800 px-2 py-1 rounded">Secrets</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Integration Guide Hint */}
                <div className="mt-8 p-4 border border-blue-100 bg-blue-50 rounded-lg flex items-start gap-3">
                    <ExternalLink className="text-blue-500 mt-1 shrink-0" size={20} />
                    <div>
                        <h4 className="font-semibold text-blue-900">Integration Quick Guide</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            Partners should include the <code>x-api-key</code> header in all requests.
                            Use the App ID to identify the source application in your logs.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerManager;
