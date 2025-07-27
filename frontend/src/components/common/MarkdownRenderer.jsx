import React from 'react';
import ReactMarkdown from 'react-markdown';

const MarkdownRenderer = ({ content, className = '', truncate = false }) => {
  if (!content) return null;

  // For truncated content, we need to be more careful with styling
  const truncateClass = truncate === true ? 'line-clamp-3' : truncate === 'short' ? 'line-clamp-2' : '';

  const markdownComponents = {
    // Customize heading styles
    h1: ({ children }) => (
      <h1 className="text-xl font-bold text-gray-900 mb-2">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-gray-900 mb-1">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-gray-900 mb-1">{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-sm font-medium text-gray-900 mb-1">{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-medium text-gray-700 mb-1">{children}</h6>
    ),
    
    // Customize paragraph styles
    p: ({ children }) => (
      <p className="text-gray-600 mb-2 leading-relaxed">{children}</p>
    ),
    
    // Customize list styles
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-gray-600 mb-2 space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-gray-600 mb-2 space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-600">{children}</li>
    ),
    
    // Customize code styles
    code: ({ inline, children }) => {
      if (inline) {
        return (
          <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono">
            {children}
          </code>
        );
      }
      return (
        <code className="block bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono overflow-x-auto mb-2">
          {children}
        </code>
      );
    },
    
    // Customize blockquote styles
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">
        {children}
      </blockquote>
    ),
    
    // Customize link styles
    a: ({ href, children }) => (
      <a 
        href={href} 
        className="text-blue-600 hover:text-blue-800 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    
    // Customize strong/bold styles
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    
    // Customize emphasis/italic styles
    em: ({ children }) => (
      <em className="italic text-gray-700">{children}</em>
    ),
    
    // Customize horizontal rule
    hr: () => (
      <hr className="border-gray-300 my-4" />
    ),
    
    // Customize table styles
    table: ({ children }) => (
      <table className="min-w-full border-collapse border border-gray-300 mb-2">
        {children}
      </table>
    ),
    th: ({ children }) => (
      <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-900">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-300 px-3 py-2 text-gray-600">
        {children}
      </td>
    ),
  };

  return (
    <div className={`markdown-content ${truncateClass} ${className}`}>
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
