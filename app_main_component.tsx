import React, { useState, useEffect } from 'react';
import { 
  Car, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  History, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Play, 
  FileText,
  Clock,
  Navigation,
  Activity
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Operational Costs State
  const [vehicle, setVehicle] = useState({
    model: 'Veículo Padrão',
    fuelPrice: 5.79,
    kmPerLiter: 12.0,
    maintenancePerKm: 0.15,
    depreciationPerKm: 0.18,
    fixedCostsMonthly: 800,
    monthlyKm: 3000
  });

  // Target Settings
  const [targets, setTargets] = useState({
    minRatePerKm: 2.00,
    minRatePerHour: 35.00,
    minNetProfit: 5.00,
    minProfitMargin: 30.0,
    emptyReturnFactor: 1.0
  });

  // Simulator Input State
  const [offerInput, setOfferInput] = useState({
    grossFare: '28.50',
    pickupDistance: '2.5',
    tripDistance: '10.75',
    pickupTime: '6',
    tripTime: '32',
    rating: '4.92'
  });

  // History Log
  const [history, setHistory] = useState([
    {
      id: 1,
      date: '14:25 - Hoje',
      fare: 34.80,
      dist: 14.2,
      time: 38,
      netProfit: 18.50,
      rateKm: 2.45,
      recommendation: 'ACCEPT'
    },
    {
      id: 2,
      date: '13:50 - Hoje',
      fare: 12.00,
      dist: 8.5,
      time: 25,
      netProfit: 3.20,
      rateKm: 1.41,
      recommendation: 'REJECT'
    }
  ]);

  // Derived Calculations
  const calculatedVariableCostPerKm = 
    (vehicle.fuelPrice / vehicle.kmPerLiter) + 
    vehicle.maintenancePerKm + 
    vehicle.depreciationPerKm;
  
  const calculatedFixedCostPerKm = vehicle.monthlyKm > 0 
    ? vehicle.fixedCostsMonthly / vehicle.monthlyKm 
    : 0;

  const totalCostPerKm = calculatedVariableCostPerKm + calculatedFixedCostPerKm;

  // Real-time calculation for simulator
  const parseNum = (val) => parseFloat(val) || 0;
  const fare = parseNum(offerInput.grossFare);
  const totalDist = (parseNum(offerInput.pickupDistance) + parseNum(offerInput.tripDistance)) * targets.emptyReturnFactor;
  const totalTimeMin = parseNum(offerInput.pickupTime) + parseNum(offerInput.tripTime);
  const totalTimeHours = totalTimeMin / 60;

  const ratePerKm = totalDist > 0 ? fare / totalDist : 0;
  const ratePerHour = totalTimeHours > 0 ? fare / totalTimeHours : 0;
  const totalOpCost = totalDist * totalCostPerKm;
  const netProfit = fare - totalOpCost;
  const profitMargin = fare > 0 ? (netProfit / fare) * 100 : 0;

  // Recommendation Engine Logic
  const getRecommendation = () => {
    let score = 0;
    const triggers = [];

    if (ratePerKm >= targets.minRatePerKm) score += 2; 
    else triggers.push(`R$/km baixo (R$ ${ratePerKm.toFixed(2)})`);

    if (ratePerHour >= targets.minRatePerHour) score += 2;
    else triggers.push(`R$/h baixo (R$ ${ratePerHour.toFixed(2)})`);

    if (netProfit >= targets.minNetProfit) score += 1;
    else triggers.push(`Lucro baixo (R$ ${netProfit.toFixed(2)})`);

    if (profitMargin >= targets.minProfitMargin) score += 1;
    else triggers.push(`Margem baixa (${profitMargin.toFixed(1)}%)`);

    if (score >= 3) return { status: 'ACCEPT', label: 'ACEITAR', color: 'bg-emerald-600', textCol: 'text-emerald-400', triggers };
    if (score >= 0) return { status: 'EVALUATE', label: 'AVALIAR', color: 'bg-amber-600', textCol: 'text-amber-400', triggers };
    return { status: 'REJECT', label: 'RECUSAR', color: 'bg-rose-600', textCol: 'text-rose-400', triggers };
  };

  const currentRec = getRecommendation();

  const handleAddSimulatedRide = () => {
    const newRide = {
      id: Date.now(),
      date: 'Agora',
      fare: fare,
      dist: totalDist,
      time: totalTimeMin,
      netProfit: netProfit,
      rateKm: ratePerKm,
      recommendation: currentRec.status
    };
    setHistory([newRide, ...history]);
  };

  const exportCSV = () => {
    const headers = "Data,Valor Bruto,Distancia Km,Tempo Min,Lucro Liquido,R$/Km,Recomendacao\n";
    const rows = history.map(h => `${h.date},${h.fare},${h.dist},${h.time},${h.netProfit},${h.rateKm},${h.recommendation}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LF_Driver_Pro_Export_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col max-w-md mx-auto shadow-2xl border-x border-neutral-800">
      
      {/* Header Bar */}
      <header className="p-4 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black">
            LF
          </div>
          <div>
            <h1 className="font-bold text-base leading-none text-white">LF DRIVER PRO</h1>
            <span className="text-[10px] text-amber-400 font-medium">COPILOTO INTELIGENTE</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            SERVICE ACTIVE
          </span>
        </div>
      </header>

      {/* Main Container Body */}
      <main className="flex-1 p-4 overflow-y-auto space-y-4">

        {/* Tab 1: Live Simulator & Floating Overlay View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            
            {/* Simulation Header */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex justify-between items-center">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-500" />
                Simulador de Oferta Uber
              </span>
              <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">
                Custo/Km: R$ {totalCostPerKm.toFixed(2)}
              </span>
            </div>

            {/* Inputs Form */}
            <div className="grid grid-cols-2 gap-3 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
              <div>
                <label className="text-[11px] text-neutral-400">Valor Oferecido (R$)</label>
                <input 
                  type="number" 
                  value={offerInput.grossFare} 
                  onChange={e => setOfferInput({...offerInput, grossFare: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-amber-400 font-bold text-lg focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400">Nota Passageiro</label>
                <input 
                  type="number" 
                  value={offerInput.rating} 
                  onChange={e => setOfferInput({...offerInput, rating: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white font-bold text-lg focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400">Dist. Embarque (Km)</label>
                <input 
                  type="number" 
                  value={offerInput.pickupDistance} 
                  onChange={e => setOfferInput({...offerInput, pickupDistance: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white font-semibold outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400">Dist. Viagem (Km)</label>
                <input 
                  type="number" 
                  value={offerInput.tripDistance} 
                  onChange={e => setOfferInput({...offerInput, tripDistance: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white font-semibold outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400">Tempo Embarque (Min)</label>
                <input 
                  type="number" 
                  value={offerInput.pickupTime} 
                  onChange={e => setOfferInput({...offerInput, pickupTime: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white font-semibold outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400">Tempo Viagem (Min)</label>
                <input 
                  type="number" 
                  value={offerInput.tripTime} 
                  onChange={e => setOfferInput({...offerInput, tripTime: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white font-semibold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* FLOATING CARD OVERLAY PREVIEW */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">
                Pré-visualização do Cartão Flutuante (Sobreposição Overlay)
              </span>

              <div className="bg-neutral-900 border-2 border-neutral-700 rounded-2xl p-4 shadow-2xl relative space-y-3">
                {/* Status Bar Header */}
                <div className="flex justify-between items-center">
                  <span className={`${currentRec.color} text-white font-black px-3 py-1 rounded-lg text-sm tracking-wider shadow-md`}>
                    {currentRec.label}
                  </span>
                  <span className="text-2xl font-black text-white">
                    R$ {fare.toFixed(2)}
                  </span>
                </div>

                {/* Grid Metrics */}
                <div className="grid grid-cols-4 gap-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80 text-center">
                  <div>
                    <div className="text-[9px] font-bold text-neutral-500">R$/KM</div>
                    <div className="text-xs font-bold text-white">R$ {ratePerKm.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-neutral-500">R$/HORA</div>
                    <div className="text-xs font-bold text-white">R$ {ratePerHour.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-neutral-500">TOTAL KM</div>
                    <div className="text-xs font-bold text-white">{totalDist.toFixed(1)} km</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-neutral-500">LUCRO EST.</div>
                    <div className="text-xs font-bold text-emerald-400">R$ {netProfit.toFixed(2)}</div>
                  </div>
                </div>

                {/* Alert Triggers */}
                {currentRec.triggers.length > 0 && (
                  <div className="text-[11px] text-rose-400 font-medium bg-rose-950/40 border border-rose-900/50 p-2 rounded-lg flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{currentRec.triggers.join(' • ')}</span>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={handleAddSimulatedRide}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-black" />
              REGISTRAR CORRIDA SIMULADA NO HISTÓRICO
            </button>
          </div>
        )}

        {/* Tab 2: Vehicle & Cost Settings */}
        {activeTab === 'vehicle' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Custo Operacional do Veículo</h2>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3">
              <div>
                <label className="text-xs text-neutral-400">Preço do Combustível (R$/Litor)</label>
                <input 
                  type="number" 
                  value={vehicle.fuelPrice}
                  onChange={e => setVehicle({...vehicle, fuelPrice: parseFloat(e.target.value) || 0})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white font-semibold outline-none focus:border-amber-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400">Consumo Médio (Km/L)</label>
                <input 
                  type="number" 
                  value={vehicle.kmPerLiter}
                  onChange={e => setVehicle({...vehicle, kmPerLiter: parseFloat(e.target.value) || 1})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white font-semibold outline-none focus:border-amber-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400">Manutenção + Pneus (R$/Km)</label>
                <input 
                  type="number" 
                  value={vehicle.maintenancePerKm}
                  onChange={e => setVehicle({...vehicle, maintenancePerKm: parseFloat(e.target.value) || 0})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white font-semibold outline-none focus:border-amber-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400">Depreciação Estimada (R$/Km)</label>
                <input 
                  type="number" 
                  value={vehicle.depreciationPerKm}
                  onChange={e => setVehicle({...vehicle, depreciationPerKm: parseFloat(e.target.value) || 0})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white font-semibold outline-none focus:border-amber-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400">Custos Fixos Mensais (Seguro, IPVA, etc - R$)</label>
                <input 
                  type="number" 
                  value={vehicle.fixedCostsMonthly}
                  onChange={e => setVehicle({...vehicle, fixedCostsMonthly: parseFloat(e.target.value) || 0})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white font-semibold outline-none focus:border-amber-500 mt-1"
                />
              </div>
            </div>

            {/* Calculated Breakdown Card */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-2">
              <h3 className="text-xs font-bold text-neutral-400 uppercase">Resumo de Custos Calculados</h3>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Combustível/Km:</span>
                <span className="font-mono font-bold text-white">R$ {(vehicle.fuelPrice / vehicle.kmPerLiter).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Variável Total/Km:</span>
                <span className="font-mono font-bold text-white">R$ {calculatedVariableCostPerKm.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Fixo Rateado/Km:</span>
                <span className="font-mono font-bold text-white">R$ {calculatedFixedCostPerKm.toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-800 pt-2 flex justify-between text-base font-bold">
                <span className="text-amber-500">CUSTO REAL TOTAL/KM:</span>
                <span className="font-mono text-amber-400">R$ {totalCostPerKm.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: History & Reports */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Histórico de Corridas</h2>
              <button 
                onClick={exportCSV}
                className="bg-neutral-800 hover:bg-neutral-700 text-xs px-3 py-1.5 rounded-lg border border-neutral-700 flex items-center gap-1 font-semibold"
              >
                <FileText className="w-3.5 h-3.5" /> Exportar CSV
              </button>
            </div>

            <div className="space-y-2">
              {history.map((ride) => (
                <div key={ride.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-base font-bold text-white">R$ {ride.fare.toFixed(2)}</div>
                    <div className="text-[11px] text-neutral-500">{ride.date} • {ride.dist.toFixed(1)} km • {ride.time} min</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">Lucro: R$ {ride.netProfit.toFixed(2)}</div>
                    <div className="text-[10px] text-neutral-400">R$/Km: R$ {ride.rateKm.toFixed(2)}</div>
                    <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5 ${
                      ride.recommendation === 'ACCEPT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {ride.recommendation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bg-neutral-900 border-t border-neutral-800 p-2 flex justify-around sticky bottom-0 z-50">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition ${
            activeTab === 'dashboard' ? 'text-amber-500' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          Simulador
        </button>

        <button 
          onClick={() => setActiveTab('vehicle')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition ${
            activeTab === 'vehicle' ? 'text-amber-500' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Car className="w-5 h-5 mb-0.5" />
          Veículo
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-medium transition ${
            activeTab === 'history' ? 'text-amber-500' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          Histórico
        </button>
      </nav>

    </div>
  );
}