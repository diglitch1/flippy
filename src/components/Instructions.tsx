import type { BindingSide } from '../types';

interface Props {
  bindingSide: BindingSide;
}

export function Instructions({ bindingSide }: Props) {
  return (
    <div className="instructions">
      <h3>Print &amp; assemble</h3>
      <ol>
        <li>
          Print on cardstock (about 216&nbsp;gsm flips best). In the print dialog choose{' '}
          <strong>Actual size / 100%</strong>, not “Fit to page”.
        </li>
        <li>Cut out every card along the light gray guide lines.</li>
        <li>Stack the cards in order, with number&nbsp;1 on top.</li>
        <li>Staple or clip the <strong>{bindingSide}</strong> (blank) edge to bind the spine.</li>
        <li>Thumb through the free edge to watch your video play.</li>
      </ol>
      <p className="instructions__note">
        The PDF’s first page repeats these steps and includes a 5&nbsp;cm ruler so you can confirm
        your printer is not scaling.
      </p>
    </div>
  );
}
