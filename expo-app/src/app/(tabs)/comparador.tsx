import { ComingSoon } from '@/components/placeholder';

export default function ComparadorScreen() {
  return (
    <ComingSoon
      title="Comparador Cívico"
      subtitle="Como seus parlamentares votaram nas principais votações."
      items={[
        'Votações nominais recentes da Câmara e do Senado, com placar oficial',
        'Voto de cada parlamentar que você acompanha, lado a lado',
        'Convergência de votos entre dois parlamentares',
      ]}
    />
  );
}
