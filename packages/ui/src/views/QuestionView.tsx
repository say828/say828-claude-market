import { useState } from 'react';
import Header from '../components/Header';
import { submitAnswer } from '../api';
import type { QuestionContext } from '../api';

interface Props {
  context: QuestionContext;
}

export default function QuestionView({ context }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleOptionSelect = (questionIndex: number, option: string, isMulti: boolean) => {
    const key = `q${questionIndex}`;
    if (isMulti) {
      const current = (answers[key] as string[]) || [];
      if (current.includes(option)) {
        setAnswers({ ...answers, [key]: current.filter((o) => o !== option) });
      } else {
        setAnswers({ ...answers, [key]: [...current, option] });
      }
    } else {
      setAnswers({ ...answers, [key]: option });
      if (option !== '__custom__') {
        setCustomInputs({ ...customInputs, [key]: '' });
      }
    }
  };

  const handleCustomInput = (questionIndex: number, value: string) => {
    const key = `q${questionIndex}`;
    setCustomInputs({ ...customInputs, [key]: value });
    setAnswers({ ...answers, [key]: '__custom__' });
  };

  const handleSubmit = async () => {
    const finalAnswers: Record<string, string | string[]> = {};
    context.questions.forEach((_, index) => {
      const key = `q${index}`;
      const answer = answers[key];
      if (answer === '__custom__') {
        finalAnswers[key] = customInputs[key] || '';
      } else if (Array.isArray(answer)) {
        finalAnswers[key] = answer.map((a) => (a === '__custom__' ? customInputs[key] || '' : a));
      } else {
        finalAnswers[key] = answer || '';
      }
    });
    setLoading(true);
    await submitAnswer(finalAnswers);
  };

  const allAnswered = context.questions.every((q, index) => {
    const key = `q${index}`;
    const answer = answers[key];
    if (!answer) return false;
    if (answer === '__custom__' && !customInputs[key]) return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  });

  return (
    <div className="min-h-screen p-6">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="max-w-2xl mx-auto">
        <Header
          title="Question"
          subtitle="Claude needs your input"
          icon="❓"
          badge={{ text: `${context.questions.length} question(s)`, variant: 'purple' }}
        />

        <div className="space-y-6">
          {context.questions.map((question, qIndex) => (
            <div key={qIndex} className="glass p-6 glow-purple">
              <div className="mb-5">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  {question.header}
                </span>
                <h2 className="text-lg font-medium text-white mt-1">{question.question}</h2>
              </div>

              <div className="space-y-3">
                {question.options.map((option, oIndex) => {
                  const key = `q${qIndex}`;
                  const isSelected = question.multiSelect
                    ? ((answers[key] as string[]) || []).includes(option.label)
                    : answers[key] === option.label;

                  return (
                    <label
                      key={oIndex}
                      className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'glass-strong border-indigo-500/50'
                          : 'glass-subtle hover:border-white/20'
                      }`}
                    >
                      <input
                        type={question.multiSelect ? 'checkbox' : 'radio'}
                        name={`question-${qIndex}`}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(qIndex, option.label, question.multiSelect)}
                        className="mt-1 w-4 h-4"
                      />
                      <div>
                        <div className="font-medium text-white">{option.label}</div>
                        {option.description && (
                          <div className="text-sm text-white/60 mt-0.5">{option.description}</div>
                        )}
                      </div>
                    </label>
                  );
                })}

                {/* Custom input option */}
                <label
                  className={`flex flex-col gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                    answers[`q${qIndex}`] === '__custom__'
                      ? 'glass-strong border-indigo-500/50'
                      : 'glass-subtle hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type={question.multiSelect ? 'checkbox' : 'radio'}
                      name={`question-${qIndex}`}
                      checked={answers[`q${qIndex}`] === '__custom__'}
                      onChange={() => handleOptionSelect(qIndex, '__custom__', question.multiSelect)}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-white">Other</span>
                  </div>
                  {answers[`q${qIndex}`] === '__custom__' && (
                    <input
                      type="text"
                      value={customInputs[`q${qIndex}`] || ''}
                      onChange={(e) => handleCustomInput(qIndex, e.target.value)}
                      placeholder="Enter your answer..."
                      className="w-full px-4 py-2.5 ml-8"
                      autoFocus
                    />
                  )}
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-strong p-6 mt-6">
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || loading}
              className="btn-primary px-10 py-3 min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
