
import React, { useState } from 'react';
import { useStore } from '../store';
import { UserProfile } from '../types';

export const Settings = () => {
  const { profile, updateProfile, removeSavedContext } = useStore();
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
    <div className="max-w-2xl mx-auto p-4 space-y-8 pb-24">
      <header>
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

      {/* Saved Contexts Section */}
      <section className="space-y-4">
          <header>
            <h2 className="text-xl font-bold text-slate-900">Saved Context Cards</h2>
            <p className="text-sm text-slate-500">Reusable scenarios for your daily practice.</p>
          </header>
          
          {profile.savedContexts && profile.savedContexts.length > 0 ? (
             <div className="grid grid-cols-1 gap-3">
                 {profile.savedContexts.map(ctx => (
                     <div key={ctx.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                         <p className="text-slate-700 line-clamp-2">{ctx.text}</p>
                         <button 
                            type="button"
                            onClick={() => removeSavedContext(ctx.id)}
                            className="ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            aria-label="Delete context"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                         </button>
                     </div>
                 ))}
             </div>
          ) : (
             <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                 No saved contexts yet. Save one from the Learn page!
             </div>
          )}
      </section>
    </div>
  );
};
