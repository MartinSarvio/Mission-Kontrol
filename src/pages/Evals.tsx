import Card from '../components/Card'
import Icon from '../components/Icon'

export default function Evals() {
  return (
    <div>
      <h1 className="page-title mb-1">Evalueringer</h1>
      <p className="caption mb-6">Evalueringsdatasæt og kvalitetssporing</p>

      <div className="flex gap-3 mb-6">
        <button className="btn-primary">Ny Evaluering</button>
        <button className="btn-secondary">Opret Datasæt</button>
      </div>

      <Card>
        <div className="text-center py-16">
          <Icon name="gauge" size={40} className="text-white/30 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Ingen evalueringer endnu</p>
          <p className="caption max-w-md mx-auto">
            Evalueringer giver dig mulighed for at måle agentkvalitet over tid med standardiserede testdatasæt.
            Opret et datasæt og kør din første evaluering for at komme i gang.
          </p>
        </div>
      </Card>
    </div>
  )
}
