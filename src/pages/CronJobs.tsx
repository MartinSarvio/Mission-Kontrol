import Card from '../components/Card'
import Icon from '../components/Icon'
import { cronJobs } from '../data/mock'

export default function CronJobs() {
  return (
    <div>
      <h1 className="page-title mb-1">Planlagte Jobs</h1>
      <p className="caption mb-6">{cronJobs.length} planlagte jobs</p>

      <div className="flex gap-3 mb-6">
        <button className="btn-primary">Opret Job</button>
        <button className="btn-secondary">Alarmregler</button>
      </div>

      {cronJobs.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <Icon name="clock" size={40} className="text-apple-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: '#636366' }}>Ingen planlagte jobs endnu</p>
            <p className="caption max-w-md mx-auto">
              Planlagte jobs giver dig mulighed for at automatisere gentagne opgaver som rapporter, sundhedstjek, backups og mere.
              Klik &quot;Opret Job&quot; for at komme i gang.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm" style={{ color: '#636366' }}>Jobs vises her når de er konfigureret.</p>
        </Card>
      )}
    </div>
  )
}
