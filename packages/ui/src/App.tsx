import { useEffect, useState } from 'react';
import { fetchContext, type Context } from './api';
import PlanView from './views/PlanView';
import BashView from './views/BashView';
import EditView from './views/EditView';
import QuestionView from './views/QuestionView';
import StopView from './views/StopView';
import SubagentStopView from './views/SubagentStopView';
import PostToolView from './views/PostToolView';
import Loading from './components/Loading';
import ErrorDisplay from './components/ErrorDisplay';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
  const [context, setContext] = useState<Context | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContext()
      .then(setContext)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const renderContent = () => {
    if (loading) {
      return <Loading />;
    }

    if (error) {
      return <ErrorDisplay message={error} />;
    }

    if (!context) {
      return <ErrorDisplay message="No context available" />;
    }

    switch (context.type) {
      case 'plan':
        return <PlanView context={context as any} />;
      case 'bash':
        return <BashView context={context as any} />;
      case 'edit':
        return <EditView context={context as any} />;
      case 'question':
        return <QuestionView context={context as any} />;
      case 'stop':
        return <StopView context={context as any} />;
      case 'subagent-stop':
        return <SubagentStopView context={context as any} />;
      case 'post-tool':
        return <PostToolView context={context as any} />;
      default:
        return <ErrorDisplay message={`Unknown context type: ${(context as any).type}`} />;
    }
  };

  return (
    <>
      <ThemeToggle />
      {renderContent()}
    </>
  );
}
