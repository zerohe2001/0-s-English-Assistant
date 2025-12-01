import React, { useState } from 'react';
import { useStore } from '../store';
import { UserProfile } from '../types';

export const Settings = () => {
  const { profile, updateProfile } = useStore();
  const [formData, setFormData] = useState<UserProfile>(profile);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
    alert('Profile saved!');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Your Profile</h1>
        <p className="text-slate-600 mt-2">ActiveVocab uses this to customize your examples.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Alex"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Shanghai"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Occupation</label>
            <input
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              placeholder="e.g. Marketing Manager"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hobbies / Interests</label>
          <textarea
            name="hobbies"
            value={formData.hobbies}
            onChange={handleChange}
            placeholder="e.g. Photography, Hiking, Coffee"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Frequent Places</label>
          <input
            name="frequentPlaces"
            value={formData.frequentPlaces}
            onChange={handleChange}
            placeholder="e.g. Gym, Library, Costco"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
};
