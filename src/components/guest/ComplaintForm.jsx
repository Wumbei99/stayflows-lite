import { useState } from 'react';

export default function ComplaintForm({ rating, onSubmit, isSubmitting }) {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ rating, category, message });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h3 className="text-2xl font-light text-white mb-2">We're sorry to hear that.</h3>
        <p className="text-slate-400">Please let us know what went wrong so we can fix it immediately.</p>
      </div>
      
      <div className="space-y-4 mt-2">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Category</label>
          <select 
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 appearance-none transition-all shadow-inner"
          >
            <option value="" disabled>Select an issue...</option>
            <option value="Cleanliness">Cleanliness</option>
            <option value="Service">Service</option>
            <option value="Amenities">Amenities</option>
            <option value="Noise">Noise</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Details</label>
          <textarea 
            required
            rows="3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us more about what happened..."
            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all shadow-inner"
          />
        </div>
      </div>

      <button 
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-4 py-4 px-4 bg-white hover:bg-slate-200 text-slate-900 font-medium rounded-2xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending...' : 'Send to Management'}
      </button>
    </form>
  );
}
