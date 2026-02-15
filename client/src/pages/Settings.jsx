import React, { useState, useEffect } from 'react';
import { getStages, createProduct } from '../services/configService';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('products');
    const [stages, setStages] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        currency: 'AMD',
        minAmount: '',
        maxAmount: '',
        minTenure: '',
        maxTenure: '',
        interestRate: '',
        stages: [],
        entities: []
    });

    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadStages();
    }, []);

    const loadStages = async () => {
        try {
            const data = await getStages();
            setStages(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleStageToggle = (stageName) => {
        setFormData(prev => {
            const currentStages = prev.stages || [];
            if (currentStages.includes(stageName)) {
                return { ...prev, stages: currentStages.filter(s => s !== stageName) };
            } else {
                return { ...prev, stages: [...currentStages, stageName] };
            }
        });
    };

    // Sort selected stages based on the original global order for display/processing if needed
    // But for now we just append. To support reordering, we'd need DragLimit.

    const handleEntityToggle = (type, role) => {
        setFormData(prev => {
            const currentEntities = prev.entities || [];
            const exists = currentEntities.find(e => e.type === type && e.role === role);

            if (exists) {
                return { ...prev, entities: currentEntities.filter(e => !(e.type === type && e.role === role)) };
            } else {
                return { ...prev, entities: [...currentEntities, { type, role, required: true }] }; // Default required to true
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        try {
            await createProduct({
                ...formData,
                minAmount: parseFloat(formData.minAmount),
                maxAmount: parseFloat(formData.maxAmount),
                interestRate: parseFloat(formData.interestRate),
                minTenure: parseInt(formData.minTenure),
                maxTenure: parseInt(formData.maxTenure),
                // Ensure stages are sent in the order selected? Or pre-defined?
                // For this MVP, we send them in the order they were added or selected. 
                // A better UI would allow reordering.
            });
            setMessage({ type: 'success', text: 'Product created successfully!' });
            // Reset form
            setFormData({
                name: '', description: '', currency: 'AMD',
                minAmount: '', maxAmount: '', minTenure: '', maxTenure: '', interestRate: '',
                stages: [], entities: []
            });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            <div className="flex border-b mb-6">
                <button
                    className={`px-4 py-2 ${activeTab === 'products' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
                    onClick={() => setActiveTab('products')}
                >
                    Product Types
                </button>
            </div>

            {activeTab === 'products' && (
                <div className="bg-white p-6 rounded shadow max-w-4xl">
                    <h2 className="text-xl font-semibold mb-4">Create New Product</h2>

                    {message && (
                        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Product Name</label>
                                <input
                                    type="text" name="name" required
                                    value={formData.name} onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Currency</label>
                                <select
                                    name="currency" required
                                    value={formData.currency} onChange={handleInputChange}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="AMD">AMD</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                name="description"
                                value={formData.description} onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Min Amount</label>
                                <input type="number" name="minAmount" required value={formData.minAmount} onChange={handleInputChange} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Max Amount</label>
                                <input type="number" name="maxAmount" required value={formData.maxAmount} onChange={handleInputChange} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                                <input type="number" step="0.1" name="interestRate" required value={formData.interestRate} onChange={handleInputChange} className="w-full p-2 border rounded" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Min Tenure (Months)</label>
                                <input type="number" name="minTenure" required value={formData.minTenure} onChange={handleInputChange} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Max Tenure (Months)</label>
                                <input type="number" name="maxTenure" required value={formData.maxTenure} onChange={handleInputChange} className="w-full p-2 border rounded" />
                            </div>
                        </div>

                        {/* Stages Section */}
                        <div className="border p-4 rounded bg-gray-50">
                            <label className="block text-sm font-bold mb-2">Workflow Stages (Select in Order)</label>
                            <div className="flex flex-wrap gap-2">
                                {stages.map(stage => (
                                    <button
                                        key={stage.id}
                                        type="button"
                                        onClick={() => handleStageToggle(stage.name)}
                                        className={`px-3 py-1 rounded text-sm ${formData.stages.includes(stage.name)
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white border text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {formData.stages.indexOf(stage.name) > -1 && <span className="mr-1 font-bold">{formData.stages.indexOf(stage.name) + 1}.</span>}
                                        {stage.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Entities Section */}
                        <div className="border p-4 rounded bg-gray-50">
                            <label className="block text-sm font-bold mb-2">Allowed Entities</label>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.entities.find(e => e.type === 'INDIVIDUAL' && e.role === 'APPLICANT')}
                                        onChange={() => handleEntityToggle('INDIVIDUAL', 'APPLICANT')}
                                    />
                                    <span>Individual Applicant</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.entities.find(e => e.type === 'INDIVIDUAL' && e.role === 'CO_APPLICANT')}
                                        onChange={() => handleEntityToggle('INDIVIDUAL', 'CO_APPLICANT')}
                                    />
                                    <span>Individual Co-Applicant</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.entities.find(e => e.type === 'INDIVIDUAL' && e.role === 'GUARANTOR')}
                                        onChange={() => handleEntityToggle('INDIVIDUAL', 'GUARANTOR')}
                                    />
                                    <span>Individual Guarantor</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.entities.find(e => e.type === 'LEGAL_ENTITY' && e.role === 'APPLICANT')}
                                        onChange={() => handleEntityToggle('LEGAL_ENTITY', 'APPLICANT')}
                                    />
                                    <span>Company Applicant</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                            Save Product
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Settings;
