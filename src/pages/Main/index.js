import React, {useState, useCallback, useEffect} from 'react';
import { Link } from 'react-router-dom';
import { FaGithub, FaPlus, FaSpinner, FaBars, FaTrash } from 'react-icons/fa';
import {Container, Form, SubmitButton, List, DeleteButton} from './styles';

import api from '../../services/api';

export default function Main(){

  const [newRepo, setNewRepo] = useState('');
  const [repositorios, setRepositorios] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('repos') || '[]');
      return Array.isArray(saved)
        ? saved.filter(repo => repo && typeof repo.name === 'string' && repo.name.trim())
        : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Salvar alterações
  useEffect(()=>{
    try {
      localStorage.setItem('repos', JSON.stringify(repositorios));
    } catch {
      setAlert('Não foi possível salvar os repositórios neste navegador.');
    }
  }, [repositorios]);

  const handleSubmit = useCallback((e)=>{
    e.preventDefault();
    if (loading) return;

    async function submit(){
      setLoading(true);
      setAlert(null);
      try{

        const repoName = newRepo.trim();
        if(repoName === ''){
          throw new Error('Você precisa indicar um repositório!');
        }

        if (!/^[^/\s]+\/[^/\s]+$/.test(repoName)) {
          throw new Error('Informe o repositório no formato dono/nome.');
        }

        const hasRepo = repositorios.some(repo => repo.name.toLowerCase() === repoName.toLowerCase());

        if(hasRepo){
          throw new Error('Repositório duplicado.');
        }

        const response = await api.get(`repos/${repoName.split('/').map(encodeURIComponent).join('/')}`);
        if (repositorios.some(repo => repo.name.toLowerCase() === response.data.full_name.toLowerCase())) {
          throw new Error('Repositório duplicado.');
        }
  
        const data = {
          name: response.data.full_name,
        }
    
        setRepositorios(current => [...current, data]);
        setNewRepo('');
      }catch(error){
        setAlert(error.isAxiosError
          ? (error.response?.status === 404
            ? 'Repositório não encontrado.'
            : 'Não foi possível buscar o repositório. Tente novamente.')
          : error.message);
      }finally{
        setLoading(false);
      }

    }

    submit();

  }, [newRepo, repositorios, loading]);

  function handleinputChange(e){
    setNewRepo(e.target.value);
    setAlert(null);
  }

  const handleDelete = useCallback((repo)=> {
    setRepositorios(current => current.filter(r => r.name !== repo));
  }, []);


  return(
    <Container>
      
      <h1>
        <FaGithub size={25}/>
        Meus Repositorios
      </h1>

      <Form onSubmit={handleSubmit} $error={alert}>
        <input 
        type="text" 
        placeholder="Adicionar Repositorios"
        aria-label="Repositório"
        aria-invalid={Boolean(alert)}
        aria-describedby={alert ? 'repo-error' : undefined}
        value={newRepo}
        onChange={handleinputChange}
        />

        <SubmitButton $loading={loading} aria-label="Adicionar repositório">
          {loading ? (
            <FaSpinner color="#FFF" size={14}/>
          ) : (
            <FaPlus color="#FFF" size={14}/>
          )}
        </SubmitButton>

      </Form>
      {alert && <p id="repo-error" role="alert">{alert}</p>}

      <List>
         {repositorios.map(repo => (
           <li key={repo.name}>
             <span>
             <DeleteButton aria-label={`Excluir ${repo.name}`} onClick={()=> handleDelete(repo.name) }>
                <FaTrash size={14}/>
             </DeleteButton>  
             {repo.name}
             </span>
             <Link to={`/repositorio/${encodeURIComponent(repo.name)}`} aria-label={`Abrir ${repo.name}`}>
               <FaBars size={20}/>
             </Link>
           </li>
         ))} 
      </List>

    </Container>
  )
}
