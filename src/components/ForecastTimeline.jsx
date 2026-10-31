import ForecastWeatherIcon from "./ForecastWeatherIcon";

export default function ForecastTimeline({ forecast }) {
  return <nav aria-label="Forecast date timeline" className="absolute inset-x-0 bottom-0 w-full min-w-0 z-20 bg-black/35 text-white pb-[env(safe-area-inset-bottom)]">
    <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
      <div className="flex min-w-max" role="group" aria-label="Select forecast day">
        {forecast.dates.map((date, index) => {
          const active = forecast.day === index;
          return <button key={date.value} type="button"
            aria-pressed={active} aria-label={`Forecast for ${date.label}, ${date.value}`}
            onClick={() => forecast.setDay(index)}
            className={`relative flex-1 min-w-28 h-11 border-r border-white/15 text-white px-3 py-2 text-xs whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white ${active ? 'bg-white/25 font-bold' : 'hover:bg-white/10'}`}>

            <span className="inline-flex items-center justify-center gap-2">
              <ForecastWeatherIcon code={forecast.weatherDays?.find((item) => item.date === date.value)?.weather_code} />
              <span>{date.label}</span>
            </span>
          </button>;
        })}
      </div>
    </div>
  </nav>;
}
