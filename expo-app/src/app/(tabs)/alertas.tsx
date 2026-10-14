import { ComingSoon } from '@/components/placeholder';

export default function AlertasScreen() {
  return (
    <ComingSoon
      title="Alertas"
      subtitle="Avisos sobre o que seus parlamentares fizeram."
      items={[
        'Novas votações nominais em que o parlamentar votou',
        'Novos projetos de lei apresentados',
        'Notificações no aparelho, que você liga ou desliga por tipo',
      ]}
    />
  );
}
