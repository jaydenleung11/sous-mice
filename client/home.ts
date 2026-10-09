export function homeMarkup(icon:(name:string)=>string){
  const motes=Array.from({length:12},(_,i)=>`<i class="home-mote" style="--mote:${i}"></i>`).join('');
  const steps=Array.from({length:7},(_,i)=>`<i class="home-step" style="--step:${i}"></i>`).join('');
  return `<main class="title-screen home-screen">
    <div class="hero-art" role="img" aria-label="Two mice carrying a giant wedge of cheese while a chef watches in a glowing bistro kitchen"></div>
    <div class="hero-shade"></div>
    <div class="home-lamplight" aria-hidden="true"></div>
    <div class="home-motes" aria-hidden="true">${motes}</div>
    <div class="home-footprints" aria-hidden="true">${steps}</div>
    <header class="site-header home-header">
      <a class="home-brand" href="#" aria-label="Sous Mice home"><span class="home-brand-mark">${icon('mouse')}</span><span>A BISTRO<br>CAPER</span></a>
      <button class="icon-button home-settings" id="settings" aria-label="Settings">${icon('gear')}</button>
    </header>
    <section class="home-title" aria-labelledby="game-title">
      <div class="home-kicker"><span class="home-kicker-star">✦</span> 2–8 PLAYER KITCHEN CAPER</div>
      <h1 id="game-title"><span>SOUS</span><span>MICE<span class="home-title-spark" aria-hidden="true">✦</span></span></h1>
      <p class="home-tagline">Small paws. Big trouble.</p>
      <div class="home-actions">
        <button id="create" class="home-play">${icon('arrow')}<span>START GAME</span></button>
        <button id="join" class="home-join">${icon('key')}<span>JOIN A ROOM</span></button>
      </div>
    </section>
    <div class="home-bottom">
      <button id="training" class="home-training">${icon('book')}<span>TRAINING KITCHEN</span><span class="home-training-arrow" aria-hidden="true">↗</span></button>
      <div class="home-matchup" aria-label="Mice versus chefs">${icon('mouse')}<span>MICE</span><b>VS</b>${icon('chef')}<span>CHEFS</span></div>
      <button id="credits" class="home-credits" aria-label="About Sous Mice">${icon('info')}</button>
    </div>
  </main>`;
}
