import React from 'react';

const Dashboard = () => {
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Pending Applications</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Loans Disbursed (MTD)</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">$1.2M</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Approval Rate</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">75%</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
