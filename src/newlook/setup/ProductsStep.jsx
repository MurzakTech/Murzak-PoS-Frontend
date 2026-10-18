import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import StepFrame from './StepFrame';
import { isPassed, starterCode } from './setupModel';
import T from './strings.setup';

const P = T.products;
const STEP = 'products';

const Option = ({ title, text, action, to, primary = false }) => {
  const isApp = String(to).startsWith('/new-look');
  return (
    <li className="nl-setup-option">
      <div className="nl-setup-option__text">
        <p className="nl-setup-option__title">{title}</p>
        <p className="nl-setup-option__help">{text}</p>
      </div>
      {isApp ? (
        <Button as={Link} to={to} variant={primary ? 'primary' : 'secondary'}>
          {action}
        </Button>
      ) : (
        <Button as="a" href={to} variant={primary ? 'primary' : 'secondary'}>
          {action}
        </Button>
      )}
    </li>
  );
};

/**
 * Step 5, the first products: add one yourself (New product), start from the ready-made list for this kind of shop (the current
 * starter products screen), add many from a file, or add opening stock (the current import screens). The links leave the wizard;
 * it waits at this step until you come back.
 */
const ProductsStep = ({ ctx }) => {
  const code = starterCode({ industryCode: ctx.state.industryCode, kind: ctx.state.kind });
  return (
    <StepFrame ctx={ctx} stepKey={STEP} heading={P.title} help={P.help} saved={isPassed(ctx.state, STEP)} saveLabel={ctx.nextLabel(STEP)}>
      <ul className="nl-setup-options">
        <Option title={P.add.title} text={P.add.text} action={P.add.action} to={ctx.links.newProduct} primary />
        {code ? <Option title={P.starter.title} text={P.starter.text} action={P.starter.action} to={ctx.links.starter(code)} /> : null}
        <Option title={P.file.title} text={P.file.text} action={P.file.action} to={ctx.links.fromFile} />
        <Option title={P.stock.title} text={P.stock.text} action={P.stock.action} to={ctx.links.openingStock} />
      </ul>
      <p className="nl-setup-note">{P.opensNote}</p>
    </StepFrame>
  );
};

export default ProductsStep;
