import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import applicationService from '../services/applicationService';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const Dashboard = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const data = await applicationService.listApplications();
            setApplications(data);
        } catch (err) {
            console.error('Failed to fetch applications');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'DISBURSED': return <CheckCircle className="text-green-500" size={18} />;
            case 'REJECTED': return <AlertCircle className="text-red-500" size={18} />;
            default: return <Clock className="text-blue-500" size={18} />;
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800">Operational Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Active Applications</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{applications.filter(a => a.status !== 'DISBURSED' && a.status !== 'REJECTED').length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Loans Disbursed</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">{applications.filter(a => a.status === 'DISBURSED').length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Volume</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                        {applications.reduce((acc, curr) => acc + Number(curr.amountRequested), 0).toLocaleString()} AMD
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        Recent Applications
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Stage</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Loading applications...</td></tr>
                            ) : applications.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">No applications found. Create one to get started!</td></tr>
                            ) : (
                                applications.map((app) => (
                                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm">#{app.id}</td>
                                        <td className="px-6 py-4 font-medium">{app.productType?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 font-bold">{Number(app.amountRequested).toLocaleString()} {app.currency}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${app.status === 'DISBURSED' ? 'bg-green-100 text-green-700' :
                                                    app.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {getStatusIcon(app.status)}
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{app.currentStage?.name || 'Initiated'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/applications?id=${app.id}`)}
                                                className="text-blue-600 font-bold hover:text-blue-800 text-sm"
                                            >
                                                Open Journey
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
