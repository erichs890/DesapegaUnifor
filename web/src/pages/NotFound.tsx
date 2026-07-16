import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound container">
      <p className="notfound-code" aria-hidden="true">
        404
      </p>
      <h1>Essa página se desapegou de nós</h1>
      <p className="notfound-text">
        O endereço não existe ou mudou de lugar. A vitrine continua cheia de achados.
      </p>
      <div className="notfound-acoes">
        <Link to="/" className="btn btn-primary">
          Voltar ao início
        </Link>
        <Link to="/anunciar" className="btn btn-secondary">
          Anunciar um item
        </Link>
      </div>
    </div>
  );
}
