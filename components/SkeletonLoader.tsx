
import React from 'react';

export const SkeletonCard = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between animate-pulse ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-3 w-full">
        <div className={`h-3 w-20 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
        <div className={`h-8 w-32 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
      </div>
      <div className={`w-12 h-12 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
    </div>
    <div className={`h-2.5 w-24 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
  </div>
);

export const SkeletonTable = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className="w-full">
    <div className={`px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
      <div className={`h-6 w-32 rounded-lg animate-pulse ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
      <div className={`h-4 w-24 rounded-lg animate-pulse ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
    </div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className={`px-6 py-5 flex items-center gap-6 border-b animate-pulse ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
        <div className={`w-9 h-9 rounded-lg shrink-0 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
        <div className="flex-1 space-y-2">
          <div className={`h-4 w-1/3 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
          <div className={`h-2 w-1/4 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
        </div>
        <div className={`h-4 w-20 rounded-full hidden md:block ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
        <div className={`h-6 w-24 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
      </div>
    ))}
  </div>
);
