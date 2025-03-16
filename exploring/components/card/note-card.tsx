interface NoteCardProps {
  id: number;
  title: string;
  content: string;
}

const NoteCard: React.FC<NoteCardProps> = ({ id, title, content }) => {
  return (
    <div className="card">
      <h4>Note ID: {id}</h4>
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  );
};

export default NoteCard;
