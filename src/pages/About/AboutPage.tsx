export function AboutPage() {
  return (
    <>
      <section className="hero hero--short">
        <div className="container hero__inner">
          <span className="chip chip--onDark">Acerca de Divergente</span>
          <h1 className="hero__title">Nuestra Filosofía</h1>
          <p className="hero__text">Una iniciativa educativa para pensar diferente y actuar con propósito.</p>
        </div>
      </section>

      <article className="container page about">
        <section className="about__intro" aria-labelledby="filosofia">
          <h2 id="filosofia" className="section-title">Una educación para transformar</h2>
          <p>
            Divergente es una iniciativa educativa y de liderazgo diseñada para transformar la manera en que los jóvenes
            se relacionan con el conocimiento, la sociedad y su propio potencial. Nos alejamos de los esquemas
            tradicionales y lineales para dar paso a un aprendizaje orgánico, crítico y en constante evolución.
          </p>
          <p>
            Creemos firmemente que educar no es moldear personas para encajar en el mundo actual, sino brindarles las
            herramientas para construir el mundo del mañana.
          </p>
        </section>

        <section className="about__section" aria-labelledby="lema">
          <h2 id="lema" className="section-title">Nuestro Lema</h2>
          <blockquote className="about__quote">“Piensa diferente, actúa consciente.”</blockquote>
          <ol className="about__points">
            <li>
              <strong>Piensa diferente:</strong> Despertamos el pensamiento crítico, la creatividad sin límites y la
              audacia para cuestionar paradigmas, buscar soluciones innovadoras y trazar caminos propios.
            </li>
            <li>
              <strong>Actuar consciente:</strong> Fomentamos un liderazgo con propósito, fundamentado en la ética, la
              empatía, la sostenibilidad y el compromiso activo con nuestra comunidad.
            </li>
          </ol>
        </section>

        <section className="about__section" aria-labelledby="motivacion">
          <h2 id="motivacion" className="section-title">¿Qué nos mueve?</h2>
          <p>
            El aprendizaje es una hélice en constante ascenso: un proceso continuo de autodescubrimiento donde la teoría
            y la acción consciente se entrelazan. A través de experiencias vivenciales de alto impacto —como congresos
            de filosofía, desafíos de liderazgo y ejercicios de gobernanza ciudadana— formamos una generación de líderes
            capaces de romper estructuras rígidas y volar con luz propia.
          </p>
        </section>

        <section className="about__section" aria-labelledby="pilares">
          <h2 id="pilares" className="section-title">Nuestros Pilares de Impacto</h2>
          <div className="about__pillars">
            <section className="about__pillar">
              <h3>Autonomía y Liderazgo</h3>
              <p>Capacitamos a cada estudiante para asumir las riendas de su aprendizaje y tomar decisiones estratégicas en entornos de alta exigencia.</p>
            </section>
            <section className="about__pillar">
              <h3>Pensamiento Crítico y Filosófico</h3>
              <p>Estimulamos la curiosidad intelectual para analizar el entorno con rigor, profundidad y apertura.</p>
            </section>
            <section className="about__pillar">
              <h3>Axiología y Conciencia Social</h3>
              <p>Promovemos la vivencia de valores que fortalecen el tejido social y el desarrollo humano integral.</p>
            </section>
            <section className="about__pillar">
              <h3>Ciudadanía Activa</h3>
              <p>Preparamos a los jóvenes para construir Estado y participar democráticamente en la transformación de la sociedad.</p>
            </section>
          </div>
        </section>

        <section className="about__section about__closing" aria-label="Mensaje del creador">
          <p>
            Divergente no nació como un proyecto escolar más; nació de la convicción profunda de que los jóvenes no
            necesitan que les digamos qué pensar, sino que les demos el espacio y las herramientas para descubrir cómo
            pensar.
          </p>
          <p>
            Como educador y apasionado por la transformación social, mi propósito con esta iniciativa es acompañar a
            cada estudiante a encontrar su propia voz, desafiar sus límites y liderar con empatía. Bienvenidos a este
            espacio de pensamiento libre y acción consciente.
          </p>
          <p className="about__signature">
            J. Benjamín Galvis Ávila
            <span>Líder y Creador del Proyecto Divergente</span>
            <span>Colegio Adventista ICOLVEN</span>
          </p>
        </section>
      </article>
    </>
  );
}
