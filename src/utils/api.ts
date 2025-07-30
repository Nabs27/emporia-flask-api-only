// Revenir à l'utilisation du serveur Flask local pour éviter les problèmes CORS
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = 'http://localhost:5000'; // URL de votre serveur Flask
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur API:', error);
    throw error;
  }
}; 