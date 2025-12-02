import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { UserProfile } from '../../types';

export const ProfileSection: React.FC = () => {
  const { profile, updateProfile } = useStore();
  const [formData, setFormData] = useState<UserProfile>(profile);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      ...formData,
      savedContexts: profile.savedContexts || []
    });
    alert('Profile saved!');
  };

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
        <p className="text-sm text-slate-500">Personalize your learning experience</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Alex"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
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
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
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
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
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
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none h-24 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Frequent Places</label>
          <input
            name="frequentPlaces"
            value={formData.frequentPlaces}
            onChange={handleChange}
            placeholder="e.g. Gym, Library, Costco"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Save Profile
        </button>
      </form>
    </section>
  );
};
