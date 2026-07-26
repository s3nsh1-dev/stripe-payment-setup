const CheckoutCancelPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-xl rounded-3xl border border-slate-700 bg-slate-950/90 p-10 text-center shadow-2xl shadow-slate-950/20">
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">
          Subscription Canceled
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          Your request for subscription has been canceled for this session.
        </p>
        <p className="mt-6 text-sm text-slate-400">
          Tell us why? We will work on it.
        </p>
      </div>
    </div>
  );
};

export default CheckoutCancelPage;
