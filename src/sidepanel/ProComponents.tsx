/**
 * Prompt Editor Component for Pro Users
 * Allows editing captured prompts with syntax highlighting and formatting
 */

import { useState } from 'react';
import type { ExtractionResult } from '../types';

interface PromptEditorProps {
  extractionResult: ExtractionResult;
  onSave: (editedPrompts: string[]) => void;
  onClose: () => void;
}

export function PromptEditor({ extractionResult, onSave, onClose }: PromptEditorProps) {
  const [editedPrompts, setEditedPrompts] = useState(
    extractionResult.prompts.map(p => p.content)
  );
  
  const handlePromptChange = (index: number, newContent: string) => {
    const updated = [...editedPrompts];
    updated[index] = newContent;
    setEditedPrompts(updated);
  };
  
  const handleSave = () => {
    onSave(editedPrompts);
    onClose();
  };
  
  return (
    <div className="prompt-editor-modal">
      <div className="prompt-editor-content">
        <div className="editor-header">
          <h3>✏️ Edit Prompts</h3>
          <button className="editor-close" onClick={onClose}>×</button>
        </div>
        
        <div className="editor-prompts">
          {editedPrompts.map((prompt, index) => (
            <div key={index} className="editor-prompt-item">
              <div className="editor-prompt-header">
                <span className="prompt-number">Prompt {index + 1}</span>
                <span className="character-count">{prompt.length} chars</span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => handlePromptChange(index, e.target.value)}
                className="editor-textarea"
                placeholder="Enter your prompt here..."
                rows={4}
              />
            </div>
          ))}
        </div>
        
        <div className="editor-actions">
          <button className="editor-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="editor-btn primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate Mode 2 Component for Pro Users
 * Advanced prompt generation with templates and formatting
 */

interface GenerateMode2Props {
  prompts: string[];
  onGenerate: (generatedContent: string) => void;
  onClose: () => void;
}

export function GenerateMode2({ prompts, onGenerate, onClose }: GenerateMode2Props) {
  const [selectedTemplate, setSelectedTemplate] = useState('creative');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  
  const templates = {
    creative: {
      name: '🎨 Creative Enhancement',
      description: 'Make prompts more creative and engaging',
      instruction: 'Enhance these prompts to be more creative, detailed, and engaging while preserving their core intent.'
    },
    technical: {
      name: '⚙️ Technical Precision', 
      description: 'Optimize for technical accuracy and clarity',
      instruction: 'Refine these prompts for maximum technical precision, clarity, and actionable outcomes.'
    },
    business: {
      name: '💼 Business Focus',
      description: 'Adapt for business and professional use',
      instruction: 'Transform these prompts into professional, business-oriented requests with clear objectives and deliverables.'
    },
    educational: {
      name: '📚 Educational Style',
      description: 'Structure for learning and teaching',
      instruction: 'Restructure these prompts for educational purposes, focusing on learning objectives and step-by-step guidance.'
    }
  };
  
  const handleGenerate = async () => {
    setGenerating(true);
    
    try {
      const template = templates[selectedTemplate as keyof typeof templates];
      const instruction = customInstructions || template.instruction;
      
      const combinedPrompt = `${instruction}\n\nOriginal prompts:\n${prompts.map((p, i) => `${i + 1}. ${p}`).join('\n\n')}`;
      
      // Simulate generation (replace with actual AI call)
      setTimeout(() => {
        const generated = `Generated content based on ${template.name}:\n\n${combinedPrompt}`;
        onGenerate(generated);
        setGenerating(false);
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerating(false);
    }
  };
  
  return (
    <div className="generate-mode2-modal">
      <div className="generate-mode2-content">
        <div className="generator-header">
          <h3>🚀 Generate Mode 2</h3>
          <button className="generator-close" onClick={onClose}>×</button>
        </div>
        
        <div className="generator-body">
          <div className="template-selection">
            <h4>Choose Generation Style:</h4>
            <div className="template-grid">
              {Object.entries(templates).map(([key, template]) => (
                <div
                  key={key}
                  className={`template-card ${selectedTemplate === key ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(key)}
                >
                  <div className="template-name">{template.name}</div>
                  <div className="template-desc">{template.description}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="custom-instructions">
            <h4>Custom Instructions (Optional):</h4>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="custom-textarea"
              placeholder="Add specific instructions for how you want the prompts to be transformed..."
              rows={3}
            />
          </div>
          
          <div className="source-prompts">
            <h4>Source Prompts ({prompts.length}):</h4>
            <div className="prompt-preview">
              {prompts.slice(0, 3).map((prompt, index) => (
                <div key={index} className="preview-prompt">
                  {prompt.substring(0, 100)}...
                </div>
              ))}
              {prompts.length > 3 && (
                <div className="preview-more">+{prompts.length - 3} more prompts</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="generator-actions">
          <button className="generator-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="generator-btn primary" 
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Enhanced Prompts'}
          </button>
        </div>
      </div>
    </div>
  );
}