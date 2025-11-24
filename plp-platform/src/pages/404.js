export default function Custom404() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
        <p style={{ fontSize: '1.25rem', color: '#999', marginBottom: '2rem' }}>
          Page not found
        </p>
        <a
          href="/"
          style={{ color: '#3b82f6', textDecoration: 'underline' }}
        >
          Return Home
        </a>
      </div>
    </div>
  );
}

export const getStaticProps = async () => {
  return {
    props: {},
  };
};
