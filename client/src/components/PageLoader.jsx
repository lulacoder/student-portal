import LoadingSpinner from './LoadingSpinner';

const PageLoader = ({ message = 'Loading page...' }) => {
  return (
    <div className="page-loader">
      <LoadingSpinner size="large" message={message} />
    </div>
  );
};

export default PageLoader;