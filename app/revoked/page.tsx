export default function RevokedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Accès révoqué</h1>
        <p className="text-gray-700 mb-6">
          Votre accès à l’Académie Shop Santé a été <b>révoqué par l’administrateur</b>.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Si vous pensez qu’il s’agit d’une erreur, veuillez contacter votre gestionnaire ou
          l’équipe administrative.
        </p>
        <a
          href="/invite"
          className="inline-block px-6 py-2 rounded-xl font-semibold bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white hover:opacity-95"
        >
          Retour à l’accueil
        </a>
      </div>
    </div>
  );
}
